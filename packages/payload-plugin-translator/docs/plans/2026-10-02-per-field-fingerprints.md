# Research — per-field fingerprints, so staleness can be answered per field (#118)

**Status:** ready to implement. No blocking questions.
**Issue:** #118 — `skip_existing` ignores staleness, so the admin indicator and the strategy disagree.
**Package:** `packages/payload-plugin-translator`.
**Supersedes:** an earlier draft of this work that routed a changed-field list through the job row.
That approach was built to avoid a storage change which, on measurement, is not a storage change at
all (F1). It is abandoned: it fixed less and cost more.

---

## Problem statement

Two features in the plugin answer "does this need translating?" and give different answers. The admin
indicator says a locale is out of date; `skip_existing` then refuses to refresh it, because its only
criterion is whether the target field is empty. The endpoint returns `200` and nothing changes.

They disagree because they work at different granularities. Staleness is one hash over the whole
document's translatable content, stored once per `(collection, document, targetLocale)`. The strategy
decides per field. There is no way to ask "did *this* field's source change", so the strategy asks the
only question it can — "is the target empty" — and that question has no notion of *current*.

The same gap causes a second, unreported defect that is larger in practice: auto-translate's default
`overwrite` re-translates every field whenever any field changes, destroying human corrections to
fields whose source never moved.

Both follow from one missing fact. Storing it is cheap.

---

## Proposed scope

**IN**

1. Store a fingerprint per translatable leaf instead of one per document, in the existing
   `sourceFingerprint` column, as JSON keyed by the leaf's id-based address.
2. Read records of either shape; a record written before this change keeps today's behaviour.
3. Give `FieldChunkCollector` the same id-based address the projector already produces, so the stored
   map can be looked up at the point the strategy is consulted.
4. Extend the existing drift guard to compare **addresses**, not only texts.
5. Add the per-leaf staleness answer to `StrategyContext`.
6. Have the translate handler read the prior record before translating.
7. `skip_existing` translates a leaf whose target is empty **or** whose source changed since it was
   translated. This is what #118 asks for.
8. Auto-translate translates only leaves that are stale, by the same mechanism.
9. `dismissedFingerprint` changes shape with `sourceFingerprint` (F5).
10. README, release notes, and an answer on #118.

**OUT**

- No change to the admin indicator's behaviour. `isRecordStale` must keep returning the same answer
  for the same situation; only how it computes it changes.
- No new strategy, no new plugin option, no UI.
- No change to the job row's input shape. Nothing is added to the queue.
- The future per-field selection panel is not built, and nothing is shaped speculatively for it.

### Non-functional scan

| Dimension | Verdict |
|---|---|
| Performance | **Relevant, favourable.** Computing per leaf is free — the projector already walks them and only the final hash collapses the result. Restricting runs to stale leaves shrinks provider payloads, so provider cost falls. One extra read of the prior record per run. |
| Security / access control | **N/A.** No identity path changes; the provenance read already carries the requester after the access-control work. |
| Accessibility | **N/A.** No UI change. |
| i18n / localization | **Relevant.** Non-localized fields are already excluded from the projection; the map inherits that. |
| Observability | **Relevant.** A run that translates 2 of 40 leaves looks like a run that failed on 38. |
| Storage | **Relevant.** ~50–90 bytes per leaf instead of 64 bytes per document. Row count unchanged. See F3 for the ceiling. |

---

## Codebase map

### Provenance (what changes shape)

| What | Where |
|---|---|
| Stored fields | `src/server/modules/provenance/Provenance.collection.ts:30-32` — `sourceFingerprint` (text, required), `dismissedFingerprint` (text) |
| Record type | `src/core/domain/provenance/ProvenanceStore.interface.ts:37-40` |
| Staleness rule | `src/core/domain/provenance/staleness.ts:21-28` (`isRecordStale`) — compares two strings |
| Dismiss | `ProvenanceStore.interface.ts:114` (`dismiss(key, dismissedFingerprint)`) |
| Store | `src/server/modules/provenance/Provenance.store.ts:44` |
| Service | `src/server/modules/provenance/Provenance.service.ts` — `captureFingerprint`, `record`, `getStaleness`, `dismiss` |

### The projection (already per-leaf, already id-addressed)

| What | Where |
|---|---|
| `projectTranslatableContent` | `src/core/domain/content-projection/contentProjector.ts:42-97` → `Array<{ idPath, text }>` |
| Entry shape | `contentProjector.ts:22-25` |
| `IdPath` grammar, sole constructor | `src/core/domain/content-projection/idPath.ts` — `makeIdPath`, `elementSegment`, escaping at `:33` |
| Leaf filter | `src/core/domain/content-projection/translatableLeaf.ts:17-31` — `text`/`textarea`/`richText`, localized, not excluded |
| `computeSourceFingerprint` | `computeSourceFingerprint.ts:18-23` |
| `fingerprint` | `fingerprinter.ts:34-41` — sorts by `idPath`, serializes, sha256 |

### The pipeline (what must learn the address)

| What | Where |
|---|---|
| Strategy consulted | `src/core/translation-pipeline/stages/field-collector/FieldChunkCollector.ts:112` |
| Positional path built | `FieldChunkCollector.ts:72`, `:98` (`String(index)`), `:118` |
| `FieldChunk` | `src/core/translation-pipeline/types/FieldChunk.ts` |
| `StrategyContext` | `src/core/translation-pipeline/strategies/TranslationStrategy.interface.ts:4-7` |
| Strategies (both) | `Overwrite.strategy.ts:9-11`, `SkipExisting.strategy.ts:11-24` |
| Drift guard | `src/core/translation-pipeline/stages/field-collector/driftGuard.test.ts` |
| Handler-facing input | `src/core/translation-pipeline/translateContent.ts:8-35` |
| `PipelineConfig` | `src/core/translation-pipeline/types/Pipeline.ts` |

### Callers

| What | Where |
|---|---|
| Translate handler — holds the service, captures before, records after | `src/server/features/translate-document/handler.ts:114-115`, `:139-141` |
| Auto-translate hook | `src/server/modules/auto-translate/AutoTranslateEnqueue.hook.ts:31-98`; gate at `:66` |
| Auto-translate policy | `src/server/modules/auto-translate/AutoTranslate.policy.ts` — strategy default `"overwrite"` at `:33` |
| Manual enqueue endpoint | `src/server/features/enqueue-translation/handler.ts:83-93` |

### Prior art

- `docs/plans/2026-06-30-slice6-contentprojector-idpath-design.md` — created `IdPath` and **deferred**
  re-keying the pipeline onto it: *"deferred until something needs it — likely never for
  correctness."* This task is what needs it. Reopening that deferral is in scope.
- `docs/plans/2026-09-08-one-live-job-per-document.task.md` — untouched here; nothing is added to the
  job row.
- No prior plan document and no reverted attempt for #118.

---

## Findings

**F1 — this is not a schema change, and the issue's own cost estimate is wrong.**
#118 states that per-field fingerprints "changes the provenance collection's shape and needs a
migration". The field is `{ name: "sourceFingerprint", type: "text" }`
(`Provenance.collection.ts:30`). Payload's `text` maps to an unbounded `varchar` on Postgres, `text`
on SQLite, a string on Mongo. Putting a different string into a text column is not a schema change:
no DDL, no migration, no backfill. The migration was the expensive part of the issue's estimate, and
it does not exist.

**F2 — computing per leaf is free; only the final hash collapses it.**
`computeSourceFingerprint` is `fingerprint(projectTranslatableContent(doc, schema))`, and the
projector already emits one `{ idPath, text }` per translatable leaf. The per-leaf data is produced
today and discarded.

**F3 — size, measured against the real limits.**
Per entry: address 20–60 chars + hash + JSON punctuation ≈ 50–90 bytes.

| Translatable leaves | Map size |
|---|---|
| 40 | ~3 KB |
| 500 | ~35 KB |
| 5 000 | ~350 KB |

Limits: Postgres unbounded `varchar` → 1 GB; SQLite → ~1 GB; **Mongo → the 16 MB document limit, which
is the binding one.** At ~90 bytes per leaf that is ~180 000 leaves in one document.

The ceiling is also self-limiting: the entry count equals the translatable-leaf count, which is exactly
the number of texts sent to the provider. The map cannot grow independently of work already being paid
for.

**F4 — a wrong address fails safe; a colliding address would not, and is prevented.**
If an address changes when it should not (schema rename, element deleted and recreated, block type
changed), the old key is orphaned and the new key is absent — the leaf reads as never translated and
is translated. The cost is a redundant provider call, never a skipped update.

The dangerous direction is two distinct leaves rendering to one address, which would mask one behind
the other. `makeIdPath` escapes `\ # . :` (`idPath.ts:33`) precisely so a field name or id cannot forge
a separator.

Payload guarantees the ids this rests on: `fields/config/sanitize.js:124-128` pushes an `id` field onto
every array that lacks one, and `baseIDField` carries both a `defaultValue` and a
`beforeChange: value || new ObjectId()`. `elementSegment` falls back to a positional segment when an id
is absent — again the safe direction.

**F5 — `dismissedFingerprint` must change shape with `sourceFingerprint`.**
`isRecordStale` (`staleness.ts:21-28`) is two string comparisons:
`current !== record.sourceFingerprint && current !== record.dismissedFingerprint`. If the source side
becomes a map and the dismissed side stays a single hash, the second comparison can never match again
and **dismissing silently stops working** — the indicator would never hide. The two fields are one
mechanism and move together.

**F6 — the drift guard exists but does not guard what this task depends on.**
`driftGuard.test.ts` runs both the projector and the collector over one fixture and asserts they agree
on the **set of texts**, the **count** of leaves, and the **exclusions**. It never compares addresses —
and cannot today, because only one side has an id-based address. So it stays green while the two sides
disagree about addresses, which is exactly the present state. The address is about to become the join
key between stored data and the running pipeline; the guard must be extended or it gives false comfort.

**F7 — the handler is already positioned for the extra read.**
`translate-document/handler.ts:114-115` already resolves the provenance service and computes a
fingerprint of the source *before* translating, and records it after success at `:139-141`. What is
missing is a read of the prior record.

---

## Design constraints (binding on implementation)

**D-A — tests red first.** Every criterion below is written as a test that fails against the current
tree before the change, and the failure is captured. A test that is green on first run proves nothing
about what it guards.

**D-B — the long-value tests run on all three adapters.** The claim in F1/F3 — that a multi-kilobyte
JSON string round-trips through the `sourceFingerprint` column — is a claim about three different
databases and must be measured on each (SQLite, PostgreSQL, MongoDB), not reasoned about from Payload's
field type. These are integration tests in `apps/dev/src/integration/translator/`.

**D-C — the two stored shapes are distinguished by the type system, not by a runtime sniff.**
"Legacy single hash" and "per-field map" are a discriminated union parsed once at the boundary, so the
compiler forces every reader to handle both. Scattered `startsWith("{")` checks are not acceptable:
they put the decision in N places and make the legacy path invisible to the type-checker.

---

## Acceptance criteria (draft)

Each is red before the change; the red run is captured.

1. **Given** a document translated to `de`, **when** only the English `body` is edited and a
   `skip_existing` run executes, **then** the German `body` is retranslated and the German `title` is
   byte-identical to its prior value. *(This is #118's reproduction.)*
   *Checked by:* integration test, all three adapters.
2. **Given** the same edit, **then** the provider receives only the `body` text.
   *Checked by:* the harness's provider call counter / recorded payload.
3. **Given** auto-translate configured with the default `overwrite`, **when** one field's source
   changes, **then** only that field is translated and the others keep their target values.
   *Checked by:* integration test.
4. **Given** a provenance record written before this change (a bare 64-char hex hash), **when** a
   translation runs, **then** it behaves exactly as today and the record is upgraded to the map form on
   write.
   *Checked by:* unit test on the parser plus an integration test seeding a legacy row.
5. **Given** a document with ~500 translatable leaves, **when** it is translated, **then** the stored
   `sourceFingerprint` round-trips intact and parses back to the same map.
   *Checked by:* integration test on **each** of SQLite, PostgreSQL, MongoDB (D-B).
6. **Given** an element inserted at the head of a localized array, **when** a run executes, **then**
   only the new element's leaves are translated and its siblings' target values are untouched.
   *Checked by:* integration test. This fails if addresses are positional.
7. **Given** the fixture in `driftGuard.test.ts`, **then** the projector and the collector produce the
   **same set of addresses**, not merely the same texts.
   *Checked by:* the new assertion in that file (F6).
8. **Given** an editor dismissed a staleness warning, **when** the source has not changed since,
   **then** the indicator stays hidden — dismissal still works after the shape change.
   *Checked by:* unit test on `isRecordStale` plus an integration test (F5).
9. **Given** any record, **when** the admin indicator is computed, **then** it reports the same
   staleness as before this change for the same situation.
   *Checked by:* the existing staleness tests must pass unmodified.
10. **Given** a field removed from the schema, **when** the document is translated again, **then** its
    orphaned address is not carried into the newly written map.
    *Checked by:* unit test.
11. **Negative path — given** a stored value that is neither a legal map nor a legal hash, **when** it
    is read, **then** the record is treated as absent (translate everything) and no exception escapes.
    *Checked by:* unit test.
12. README, release notes and the #118 answer state the new behaviour, including that `skip_existing`
    now refreshes a changed field.
    *Checked by:* reading the files.

---

## Open questions

### Blocking

None.

### Non-blocking — each carries a default

1. **Hash length per leaf.** sha256 is 64 hex chars; truncating to 16 halves the map.
   **Default:** truncate to 16, pinned in the type, with the choice recorded. Collision risk at this
   scale is not meaningful, and the value is a change-detector, not a security token.
2. **Mongo's 16 MB ceiling.** Reachable only at ~180 000 leaves in one document (F3).
   **Default:** do not cap. Record the arithmetic and let AC 5 measure the realistic case. A cap is
   speculative machinery for a document that cannot be translated anyway.
3. **Is the restricted set logged?**
   **Default:** one debug-level line with the count of leaves selected, at the point the set is applied.
4. **Publish after draft saves.** For a drafts collection the hook proceeds only when
   `doc._status === "published"` (`AutoTranslate.policy.ts:97-105`), and on update `previousDoc` is the
   prior stored row, which after draft saves already holds the new text. Auto-translate may therefore
   not fire at all. **This exposure exists today and is not created by this work** — and with per-leaf
   staleness read from the record rather than from `previousDoc`, item 8 of scope may incidentally
   change it. **Default:** write the test to establish the present fact first, then state plainly in
   the contract whether the change moved it. Do not claim a fix that was not designed.
5. **`AutoTranslateConfig.strategy`.** With auto-translate restricted to stale leaves, `overwrite` and
   `skip_existing` converge there.
   **Default:** leave it working, mark it `@deprecated` in the type naming its replacement and removal
   point. The repository already uses this device (`src/plugin.ts:120` and four more). No runtime
   warning machinery: the whole strategy family is slated for removal when auto-translate configuration
   moves from the developer to the editor, and warnings for one member of a family being deleted
   wholesale is work that gets thrown away.
6. **The collector's positional `path`.** It has no production reader and 28 assertions in
   `FieldChunkCollector.test.ts`.
   **Default:** replace it with the id-based address rather than adding a second identifier; rewrite the
   assertions. A field nothing reads is how the present wrong one survived.

### Restate check

- **"Per-field fingerprint"** means a hash of one translatable leaf's extracted source *text*, keyed by
  its `IdPath`. Not a hash of the field's raw value, and not the text itself — storing text would
  duplicate document content into a second table.
- **"Stale leaf"** means: its address is absent from the stored map (never translated), or its stored
  hash differs from the hash of its source text now.
- **"Legacy record"** means a `sourceFingerprint` holding the current single document-wide hash. It is
  read, honoured, and replaced with a map the next time that document-locale is translated. Nothing is
  backfilled.

---

## Risks & constraints

- **A stored-format change without a migration is still a stored-format change.** The legacy path is
  the highest-risk surface here, which is why D-C puts both shapes in the type system and AC 4 and
  AC 11 are red-first.
- **The translation hot path.** `FieldChunkCollector` runs on every translation, manual and automatic.
- **`core` contracts.** `StrategyContext` gains a field; both strategies implement the interface.
- **`core` stays Payload-free.** The parser, the map type and the staleness rule belong beside the
  existing pure code in `core/domain/`.
- **Three adapters.** Baselines before this work: SQLite 160, PostgreSQL 166, MongoDB 159 passing of
  167. Unit baseline 1842; `oxlint` background exactly 55 warnings, 0 errors.
- **Released behaviour changes.** `skip_existing` begins refreshing changed fields, and auto-translate
  stops rewriting untouched ones. Both belong in release notes.

### Consistency self-check

- Every IN-scope item has a criterion: 1→AC 5; 2→AC 4, 11; 3→AC 6; 4→AC 7; 5→AC 1; 6→AC 1; 7→AC 1, 2;
  8→AC 3; 9→AC 8; 10→AC 12. AC 9 and AC 10 guard OUT-of-scope invariants.
- No criterion contradicts an OUT-of-scope line; AC 9 enforces one.
- Everything traces to a file:line, to the issue, or to a measurement above. Marked inference: the
  claim that a per-leaf debug line is needed to tell a restricted run from a broken one rests on the
  absence of any per-field logging today.

---

## Readiness

- Unresolved **blocking** questions: **0**.
- IN-scope items with no acceptance criterion: **0**.

**Ready.** Six remaining questions all carry defaults and none changes the shape of the work.

## Suggested next step

**Ready for the implementation workflow.** Risk is **high**: a stored-format change with a legacy path,
a `core` contract change, the translation hot path, and 28 existing assertions to rewrite.

No system-level design pass is needed — placement is forced at every step (the map and its parser beside
the existing pure provenance code, the address from the existing sole constructor, the staleness input
at the one place the strategy is already consulted) — with one exception worth naming: **the stored
format and its legacy path are a data-model decision**, and if the implementation finds the
discriminated union fighting the storage layer, that is the signal to stop and design rather than
improvise.
