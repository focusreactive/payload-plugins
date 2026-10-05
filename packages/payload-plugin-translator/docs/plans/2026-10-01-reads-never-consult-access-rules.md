# Reads never consult the host's access rules

Read against package **0.13.4** (the `@since 0.14.0` identity work is in the tree, unreleased),
Payload **3.84.1**. Defensive audit requested by the maintainer. Supersedes the read-related parts
of `2026-09-15-access-control-surface-research.md` — two of its findings are now fixed, see below.

## Problem statement

**The plugin overrides the host's own read rules.** Not "fails to check them" — overrides them. The
Local API wrapper defaults `overrideAccess` to `true`, and every one of the plugin's seven reads
takes that default, which tells Payload in so many words: ignore the rules this project declared.
A host who wrote `access: { read: … }` on their collection has that decision silently discarded
whenever the translator touches the document.

So the plugin holds an opinion it has no business holding. Access is the host's to decide, declared
where they already declare it; the plugin's own `access` property is a separate thing — a gate for
the plugin's HTTP endpoints — and it does not and cannot stand in for a collection's read rule.

The fix is therefore **not** "check permissions under condition X". It is to stop overriding: one
value, no branch, and let Payload apply whatever the host declared to whoever is in the request.

## Codebase map

`src/core` has zero database reads and zero `payload` imports, enforced by
`src/core/__tests__/no-payload-boundary.test.ts`. Everything below is `src/server`.

### The seven read sites

| # | file:line | API | collection | `overrideAccess` | result goes to |
|---|---|---|---|---|---|
| R1 | `shared/payload/sourceDocument.ts:19` | `findByID`, `draft:true` | managed host | not passed → **true** | three callers, below |
| R2 | `features/_lib/collection-utils.ts:20` | `find`, `pagination:false`, no limit | managed host | not passed → **true** | job rows; only a count on the wire |
| R3 | `features/translate-document/handler.ts:78` | `findByID`, target locale | managed host | not passed → **true** | the pipeline, then a write |
| R4 | `features/translate-document/translationPermission.ts:97` | `findByID` | **users** | **`true`, explicit** | the rebuilt requester; never on the wire |
| R5 | `modules/provenance/Provenance.store.ts:106` | `find` | provenance sidecar | not passed → **true** | **the staleness response body** |
| R6 | `modules/provenance/Provenance.store.ts:139` | `find`, `limit:1` | provenance sidecar | not passed → **true** | feeds a write only |
| R7 | `modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts:284` | `find`, `pagination:false`, no limit | `payload-jobs` | not passed → **true** | **both status response bodies** |

R1's three callers differ: `translate-document/handler.ts:77` (feeds a write),
`translate-field/handler.ts:78` (**its translated value reaches the wire**), and
`Provenance.service.ts:183` (hashed, discarded — and it drops `this.scope`, unlike every other call
in that class, so a staleness recompute inside a caller's transaction reads outside it).

### What reaches the wire

Four endpoints return data. Three carry **metadata only** — job row ids, status enums, ISO
timestamps, locale codes, strategy names:

- `GET {base}/collection/:slug` → `{docs:[{id,status}]}`; `id` is a **jobs row** id, not a document id.
- `GET {base}/document/:slug/:id` → per-locale job status, including `error.message` **scrubbed**
  through `toClientErrorMessage` (`get-document-status/model.ts:107`).
- `GET {base}/stale/:slug/:id` → `{target_lng, source_lng, is_stale, translated_at}` per locale.
  The source document is read and hashed; the hash never leaves.

One endpoint carries **host document content**:

- `POST {base}/field`, `status:"translated"` arm (`translate-field/handler.ts:139-143`) returns the
  provider's translation of a saved field value, read with `draft: true`
  (`sourceDocument.ts:6`, `CURRENT_VERSION_OF_THIS_LOCALE_ONLY`). So the caller receives
  **unpublished, unreviewed** content, up to 262144 bytes for rich text. This endpoint is **opt-in**
  — `fieldLevel()` is not in the default level set (`composition/levels/fieldLevel.ts:32-40`).

### Identity on read paths

`req.user` is populated — Payload builds a full `PayloadRequest` for root custom endpoints, and every
handler takes one. It is read in exactly two places in the package, `identityOf.ts:13` and the
consumer's own guard. `identityOf` has two callers, **both writes**
(`enqueue-translation/handler.ts:95`, `AutoTranslateEnqueue.hook.ts:81`). On every read path the
identity is dropped at the handler boundary.

### Framework behaviour that shapes the options

Measured in the installed Payload 3.84.1:

| situation under `overrideAccess: false` | behaviour |
|---|---|
| the rule returns a where-query | **merged into the SQL** — `collections/operations/find.js:74` |
| the rule returns `false`, list read | empty page with `disableErrors`, else `Forbidden` — `find.js:52` |
| the rule returns `false`, single read | `Forbidden`, or `null` with `disableErrors` |
| **no `read` rule declared, user present** | allowed — `auth/executeAccess.js:17` |
| **no `read` rule declared, anonymous** | **`Forbidden`** — `auth/executeAccess.js:20` |

Two consequences. List reads fold the rule into the query, so honouring read rules on a list is one
rule evaluation, not one per row. And turning `overrideAccess` off refuses anonymous callers **with
no rule written by the host at all**, because of the last row.

### Reuse available

- `RebuiltRequester` and `findRequester` (`translate-document/translationPermission.ts`) already
  rebuild a user from an id at the depth Payload authenticates at. A read path needs the same object.
- `freshReq(scope)` already carries a per-call request; it currently carries a transaction id and a
  requester, and nothing reads the requester on a read path.
- `AnyAccessGuard` is the documented way to opt the endpoint gate open.

### Prior findings that no longer hold

1. **"The provenance sidecar is readable and writable by any authenticated user."** Fixed. It
   declares `access: { read: () => false, create: () => false, update: () => false, delete: () => false }`
   (`Provenance.collection.ts:18-23`), locked by `__tests__/Provenance.collection.access.test.ts`.
2. **"`/field` noop paths echo the document value."** Fixed in `5ded8b41`; the noop arm carries a
   notice and no value, locked by `translate-field/__tests__/handler.response.test.ts:64-88`.
3. **"Endpoints are open by default."** Changed: `plugin.ts:155-159` throws at config time without an
   `access` guard.

### Still open, and not previously measured

- **`payload-jobs` access is nobody's decision.** The plugin never sets `config.jobs.access` (no
  match across `src/server`, `src/plugin.ts`, `src/composition`), so that collection is governed by
  Payload's own jobs defaults. R7 reads it with rules off regardless.
- **`getAllCollectionIds` (R2) is unbounded**: `pagination: false`, no `limit`, every document id in
  the collection, rules off. Reached from `enqueue-translation/handler.ts:78` when `select_all` is
  set — so a caller past the endpoint gate can enqueue translations for documents they may not read.
- **`get-collection-status` reads zero host documents today.** It loads every translator job row ever
  created — `pagination: false`, no `limit`, `where` only `ownJobs()` — and filters by collection
  **in memory** (`PayloadJobsTaskRunner.ts:250-264`).

  A naive per-document check here would be one `findByID` per row. It does not have to be: Payload
  folds a read rule into the query (`find.js:74`), so **one** `find` over the host collection with
  `where: { id: { in: [...the ids in the result] } }` and access on returns exactly the visible ones.
  Cost is therefore **one extra id-only query per call**, not one per document. This retracts the
  earlier objection that filtering reports was too expensive.

## Proposed scope

**IN** — making host-document reads consult the host's `read` rules:

- R1 (`fetchSourceDocument`) and R3 (target-layer read), which covers the one content leak (`/field`)
  and the translation pipeline's own reads.
- R2 (`getAllCollectionIds`), so `select_all` cannot enqueue what the caller may not read.
- Deciding, and writing down, on whose behalf each read is performed.

**IN** — the report endpoints, under one rule stated by the owner:

> If you may read the document, you may see its translation history. If you may not, you see nothing.

No separate policy for reports, and nothing for the host to configure twice. Covers
`get-document-status` and `stale/:slug/:id` (one document id, one check) and
`get-collection-status` (see the cost note below).

**OUT** — named deliberately, each for a reason:
- **The `APIError` branch of `withErrorHandler`** returning `e.message` verbatim
  (`withErrorHandler.ts:19`). Real, but independent of reads, and `__tests__/withErrorHandler.test.ts:31-50`
  asserts the current behaviour as intended — changing it means revisiting a recorded decision.
- **Enumeration oracles** (managed-collection, field-path three-way, document-existence on `/field`,
  locale, the 413 size signal). Real disclosures, but they are response-shape decisions, not access
  ones, and fixing them changes the API's contract.
- **`config.jobs.access`.** A host concern to document, not a plugin default to pick.
- **The per-operation endpoint guard** (`{read, create, update, delete}`-shaped `access`). Considered
  and set aside: no caller has asked for it, and everything document-specific belongs to the host's
  collection rules, which this task is about honouring.

### Non-functional scan

- **Security / access control** — the subject. Relevant.
- **Performance** — relevant: list reads fold the rule into the query (cheap), but R2 is unbounded
  today and stays unbounded unless capped; a check on R5/R7 would be 0 → N, which is why they are out.
- **Observability** — relevant: a refused read must be distinguishable in logs from a missing
  document, or the first support ticket is unanswerable. No read path logs content today.
- **i18n / localization** — N/A to the decision; locales are already validated on the paths that take one.
- **Accessibility** — N/A; no user-facing surface changes.

## Acceptance criteria (draft)

| # | Criterion | How it is checked |
|---|---|---|
| 1 | `fetchSourceDocument` performs its read under the host's `read` rules for the named requester | integration: a collection whose `read` refuses a given user; that user's `/field` call returns no content |
| 2 | The plugin never passes `overrideAccess` on a read | a guard test over the read call sites; zero occurrences outside the requester lookup |
| 3 | A caller the rules allow still gets their translation | integration: the same fixture with an allowed user → content returned, so the fix is not a blanket refusal |
| 4 | `select_all` enqueues only documents the caller may read | integration: two documents, a rule hiding one, assert one job row |
| 5 | A refused read is reported as a refusal, not as a missing document or a provider failure | unit on the handler's error mapping; the message is in the failure-reason catalogue |
| 6 | The auto-translate hook path is unaffected when the editor may read what they just edited | the existing transaction and access integration suites stay green |
| 7 | A report shows only the documents its caller may read | integration: two documents, a rule hiding one; the collection report lists one, the document report for the hidden one is refused |
| 8 | The collection report costs one extra query, not one per row | assert the number of `find` calls for a multi-row result |

## Open questions

Coverage scan, every item answered or raised.

1. **Deleted documents** *[non-blocking]* — a job row outlives the document it names. Under the rule,
   an unreadable document hides its history, and a deleted one is unreadable. Provenance rows are
   already cleaned by an `afterDelete` hook; job rows are not. Decide whether such rows are hidden
   or shown.
2. **An empty report** *[non-blocking]* — a caller who may read nothing in the collection gets an
   empty list, indistinguishable from "nothing was ever translated". Decide which answer is correct;
   both are defensible and the choice should be written down rather than fall out of the code.
3. **Read-refused versus write-allowed** *[non-blocking]* — a user may be allowed to update a
   document but not read it, or the reverse. Matters because: the translation needs both, and the
   failure message should say which half failed.
4. **The queued path's staleness** *[non-blocking]* — the requester's rules are evaluated when the
   job runs, not when it was queued. Already the case for writes; reads would inherit it.
5. **Scripts and seeds** *[non-blocking, but tell people]* — a translation started from a script,
   a data import or a migration carries no user, so Payload will refuse the read once the override
   stops. That is Payload applying the host's rules, not a plugin decision, but it is a visible
   change in behaviour and belongs in the release notes.
6. **`Provenance.service.ts:183` drops the scope** *[non-blocking]* — reads outside the caller's
   transaction unlike its siblings. Probably a latent bug; out of this task's scope but recorded.

### Restate check

- "Read access" here means the host collection's `access.read`, evaluated by Payload, not any rule
  the plugin invents.
- "The requester" means the same `RebuiltRequester` the write path already builds — a user document
  with its `collection` key, rebuilt at the collection's auth depth.
- "Unattributed" means `scope.requester` is null, which today yields a blanket allow on writes and
  no check at all on reads.

## Risks and constraints

- **This is not a tightening, and should not be released as one.** Nobody can legitimately depend on
  the plugin discarding their own access rules, so there is no deprecation to run and no flag to add.
  What it is: translations stop happening for people the host already said may not read the
  document. Say that plainly in the release notes, because the symptom ("translation stopped
  working") will not look like the cause.
- **Draft reads.** `draft: true` resolves the newest version. Payload's read rules apply to the
  document, not the version, so honouring them does not by itself stop a draft reaching a caller who
  may read the published document. Worth stating in the design.
- **The queue has rows already.** Jobs enqueued before this change carry a requester or null; a read
  check must not strand them.
- **Do not reopen** the decisions recorded in `docs/plans/` — in particular the requester design and
  the swallow-or-propagate rule, both settled with their rejected alternatives.

## Consistency self-check

- Every IN-scope item has a criterion: R1/R3 → 1, 2, 3; R2 → 4; identity → 1, 7; messaging → 5.
- No criterion contradicts an OUT line; criteria 1–4 are integration-checkable on a real adapter.
- Criterion 6 is the regression guard, not a new behaviour.
- `[inferred]`: criterion 7 (a guard test over read sites) is not something the maintainer asked for;
  it rests on the package's existing habit of boundary guard tests.

## Readiness

- Unresolved **blocking** questions: **0** — all three were settled by the owner, see Decisions settled.
- IN-scope items with no acceptance criterion: **0**.

Ready for implementation planning.

## Decisions settled by the owner, 2026-10-02

1. **Stop overriding, unconditionally.** `overrideAccess` is Payload's internal machinery and the
   plugin should hold no opinion about it. No branch on whether a requester is named, no flag, no
   configuration. The only work this creates is plumbing: the read's request must carry the user, and
   today `freshReq(scope)` carries none.
2. **No deprecation path, because this is not a tightening.** See the risk note above.
3. **One rule for the reports:** readable document, visible history. Rejected: a separate access
   policy for the report endpoints, and the earlier proposal to leave them out of scope — the cost
   objection that justified leaving them out turned out to be wrong.

## Suggested next step

Ready for implementation planning. No system-level design pass is needed: there is one mechanism
(stop overriding, carry the user), one rule for the reports, and no new seam — the requester plumbing
the write path already owns is the thing being extended to reads.
