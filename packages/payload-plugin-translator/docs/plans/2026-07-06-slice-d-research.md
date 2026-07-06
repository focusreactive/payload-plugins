# Slice D — pre-implementation research (#47)

Research date: 2026-07-06. Payload **3.84.1**. Branch `feat/translator-provenance`, PR #61.
Feeds `/sp-task` for Slice D. Companion to the design doc
`2026-06-26-translation-provenance-and-lifecycle-design.md` (§ "Slice D … (detailed)").

## Problem statement

Provenance rows (sidecar collection, keyed `(collectionSlug, documentId, targetLocale)`) are orphaned
when the source document is deleted — never updated again, misreported by the #49/#50 dashboard, and
reusable-id-prone. Slice D cleans them up on delete, closes the public API surface for 0.7.0, and
documents the opt-in. The cleanup primitive (`PayloadProvenanceStore.deleteByDocument`) already exists
from Slice A.

## Verified facts (from 3.84.1 dist source)

1. **`afterDelete` hook args** — `{ collection, context, doc, id, req }` (`collections/config/types.d.ts:155-162`).
   `id` is **`number | string`** — must be stringified. `doc` is the just-deleted document (post-afterRead).
2. **`afterDelete` runs INSIDE the delete transaction, BEFORE commit** (`deleteByID.js`: init tx @22,
   hook loop @192-202, commit @216-218, catch→`killTransaction`→rethrow @220-223). There is **no
   built-in per-hook try/catch** in single delete → an unhandled throw **rolls back the delete**.
   → **The design-doc premise "the document is already gone" at afterDelete time is FALSE.**
3. **`afterOperation` ALSO runs before commit** (`deleteByID.js:206`, `delete.js:259`, both before the
   `commitTransaction` call). So there is **no post-commit standard collection hook** for delete.
4. **Bulk delete (`delete({where})`)** fires afterDelete **once per matched document**, each with its own
   `id` (`delete.js:82` map, `:84` `{id}=doc`, hooks @201-211). Per-doc `try/catch` records failures in
   `result.errors[]` and continues (`delete.js:219-229`) — so in bulk mode a throwing hook fails only that
   doc, not the batch; in single mode it aborts the whole delete.
5. **Nested `payload.delete` + `req`** — pass `req` → joins the same transaction (same connection, atomic,
   no deadlock, serialized). Omit `req` → **new independent transaction on another connection** → orphan-on-
   rollback risk + theoretical lock-wait/deadlock (mitigated here: sidecar has no FK to consumer tables).
   (`@payloadcms/drizzle/utilities/getTransaction.js:10-17`, `initTransaction.js:11-24`.)
6. **Current `deleteByDocument(collectionSlug, documentId)` does NOT pass `req`** — it runs the sidecar
   delete in its own transaction (`PayloadProvenanceStore.ts:68-78`).
7. **No collection hooks exist anywhere in the plugin** — greenfield. Precedent for chain-and-preserve:
   `PayloadJobsRunnerProvider.ts:193-204` (wraps existing `onInit`, try/catch, never blocks startup).
8. **Injection target** = the **sanitized `config.collections`** objects at init, filtered by the managed
   slug set (`PluginConfigBuilder.attachCollectionComponents` pattern) — NOT `pluginConfig.collections`
   (throwaway JSON clones). Mutate `collection.hooks.afterDelete` by **appending** (preserve consumer hooks).
9. **Idempotency** — `init()` modifiers can run >1×; a naive `.push(hook)` stacks duplicates. Must guard
   with a marker like `isProvenanceCollection` (`provenanceCollection.ts` marker).
10. **Sidecar is not in the managed slug set** → filtering by managed slugs naturally excludes it; the
    sidecar has no afterDelete hook → **no recursion risk**.
11. **Public exports** — `src/index.ts` exports **no** provenance symbols today; core barrel exports the 3
    types (`core/provenance/index.ts`). `TranslationProvenanceRecord` already carries `@since 0.7.0`.
12. **Trash / versions** — trash = an `update` setting `deletedAt` (fires afterChange, not afterDelete);
    version pruning bypasses collection hooks (DB-adapter level). Neither needs special handling.

## The headline finding — best-effort vs atomicity conflict

> **RESOLVED 2026-07-06 → Option B.** Follow-up source review found that `afterOperation` ALSO runs
> before commit (`deleteByID.js:206` / `delete.js:259`, both before `commitTransaction`), so Option A's
> "post-commit" premise was **wrong** — no standard collection hook is post-commit for delete. Best-effort
> therefore comes from *swallow + separate transaction* (below), not from hook choice. `afterDelete` was
> chosen (Option B): simplest, hands us `id` per document, handles bulk automatically.

The design says cleanup is **best-effort, swallow-and-log, "never fails the delete."** But facts #2/#3
show both delete hooks run *before* commit with no isolation. Best-effort is achieved by TWO things
together:
1. **Swallow** the cleanup error in our hook (try/catch) → we never throw → no `killTransaction` → the
   primary delete proceeds to commit.
2. Run cleanup in a **separate transaction** — `deleteByDocument` calls `payload.delete` **without** `req`,
   so a failure there cannot poison the primary delete's Postgres transaction. (Threading `req` would join
   the primary tx, where a failed statement poisons it → the primary commit fails even if we swallow.)

Given both hold, `afterDelete` vs `afterOperation` is purely ergonomic; `afterDelete` wins (id in hand,
per-document, no result-shape branching). Residual risk: a tiny orphan-on-rollback window if
`commitTransaction` itself fails after our separate cleanup already committed — negligible, self-healing
(next translation re-upserts provenance).

## Proposed scope

**IN:** D.1 delete-cleanup `afterDelete` hook (swallow + separate tx); D.2 export
`TranslationProvenanceRecord` (`@since 0.7.0`), keep store/key/impl internal, verify `@since` on
`provenance` config; D.3 README enable+migration section + lifecycle API docs; D.4 real-DB checks
(`dismissedFingerprint: null` round-trip SQL+Mongo, real table-name collision).

**OUT:** versions/drafts special handling; trash special handling; field-level provenance (#48/#51);
dashboard/indicator merge (#49/#50).

## Acceptance criteria

1. With `provenance` enabled, deleting a document removes **all** its provenance rows (every target
   locale); other documents' rows untouched.
2. Cleanup hook is **not attached** when `provenance` is opted out.
3. A failing sidecar cleanup **does not fail the user's document delete** (best-effort).
4. Bulk delete (`delete({where})` matching N docs) cleans provenance for all N.
5. Running plugin init twice does not stack duplicate hooks (idempotent injection).
6. Consumer-supplied `afterDelete` hooks on the same collection still run (append, not replace).
7. `TranslationProvenanceRecord` is importable from the package root; `ProvenanceStore`/`ProvenanceKey`/
   `PayloadProvenanceStore` are not.
8. `id` handled as `number | string` (stringified).

## Risks & constraints

- Must **append** to existing hook arrays and be idempotent — else clobber consumer hooks or stack dups.
- Attach to sanitized `config.collections`, not the throwaway `pluginConfig.collections`.
- Gate on `provenanceSlug` — no hook when opted out.
- Do **not** thread `req` into `deleteByDocument` — separate tx is what makes cleanup best-effort.
- D.4 needs a real Postgres instance (`apps/dev`/`apps/cms`); Mongo for the null round-trip.

## Comprehension: 9/10

Every implementation fact is source-verified. The transaction/hook strategy is resolved (Option B).

## Suggested next step

**Ready for `/sp-task`** (done — implemented via Option B).
