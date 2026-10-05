# Research: project feedback from an ideal-cms deployment (2026-09-30)

Status: research only — no implementation decided.

## Input

Feedback from a team running the translator inside an ideal-cms-based project, together with the
private visual-editing plugin. Four points:

1. ideal-cms installs translator 0.2.0 by default, which breaks some features.
2. From 0.11.1 up, the translator and the visual-editing plugin together make every translation
   fail: Postgres rejects the version insert with `invalid byte sequence for encoding "UTF8": 0x00`.
   The team is pinned to 0.11.0. Their analysis says the fix belongs in visual-editing.
3. "Select all" in the list view selects every document, but translating it processes at most 10.
4. Fields inside a block embedded in rich text are not translated.

## Parsing summary

- Source: informal prose from a consuming team; one screenshot mentioned (not available).
- Point 1 is about the ideal-cms boilerplate, not this repo.
- Point 2 comes with a root-cause analysis; the translator-side part of it checks out against the code (below).
- Point 3 is framed as "maybe intended" — the reporter is not sure it is a bug.
- Point 4 is a clear functional gap.
- Constraint: the team cannot upgrade past 0.11.0 until point 2 is resolved, so they are also
  missing every fix since then (0.11.1 → 0.13.4).

## Codebase map

Paths are relative to `packages/payload-plugin-translator/src`.

### Point 2 — source read vs visual-editing

- `server/shared/payload/sourceDocument.ts:12-27` — `fetchSourceDocument`, the only source read:
  `findByID({ req: freshReq(scope), depth: 0, draft: true, fallbackLocale: false })`. No `context`.
  Callers: `server/features/translate-document/handler.ts:73`,
  `server/features/translate-field/handler.ts:78`, `server/modules/provenance/Provenance.service.ts:179`.
- `server/features/translate-document/handler.ts:74-82` — the **target** locale read, also
  `draft: true`, also no `context`. A stega-tainted target is non-empty, so `DataReconciler.ts:84`
  and SkipExisting would keep it as is.
- `server/shared/payload/RequestScope.shapes.ts:37-39` — `freshReq` returns `{}` or `{ transactionID }`.
  Payload builds a fresh local req from it: `payloadAPI: 'local'`, empty `context`, no pathname —
  exactly the conditions under which visual-editing enriches the response.
- Origin: `b825c4a6` "take the source from the locale's own current version" (first in 0.11.1) added
  `draft: true` to the source read; `29bf09ee` (also 0.11.1) moved translation to the draft layer.
  Both were deliberate — reverting `draft: true` would bring back empty sources after a locale-scoped
  publish.
- The translator sets `context` only on its own writes (`handler.ts:21`, `translatorSkipAutoTranslate`).
- No sanitising of invisible or control characters anywhere: text-node strings go to the model raw
  (`core/.../RichTextExpander.ts:26-33`) and the reply is written raw (`TranslationMutator.ts:61`).
- Unknown keys on a rich-text value (e.g. visual-editing's `_meta`) survive: `guards.ts:14` accepts
  them, `FieldChunkCollector.ts:140` `structuredClone`s the whole value, `DataReconciler.ts:80-84`
  writes it back. So `_meta` would be persisted into the target locale.

### Point 3 — select all

- Client `client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.tsx:67-87` sends
  `collection_id: selectedIDs` (visible page only) plus `select_all: true`. Same in 0.11.0.
- Server `server/features/enqueue-translation/handler.ts:73-75` → `server/features/_lib/collection-utils.ts:16-27`:
  on `select_all` it loads **every** id of the collection (`pagination: false`, no `where`, no `req`).
- No 10-document cap exists in the plugin (`PayloadJobsTaskRunner.ts:15` batches by 10 but runs all
  batches; plugin autoRun default `limit: 50`, `PayloadJobsRunnerProvider.ts:19`).
- Likely source of "10": Payload's `/api/payload-jobs/run` defaults to `limit = 10`
  (`node_modules/payload/dist/queues/operations/runJobs/index.js:12`). A host that drains the queue by
  a cron hitting that endpoint processes 10 jobs per call. Not confirmed for the reporter's setup.
- Real defects found on the way, independent of the "10":
  - select-all ignores the list's active filter/search and translates the whole collection
    (Payload's own `DeleteMany`/`PublishMany` send the URL `where` instead);
  - the select-all lookup runs without `req`, so it skips the user's read access;
  - `maxBulkTasks` is marked resolved in `docs/plans/2026-07-29-config-combination-rules.md` but was never built;
  - `select_all` has no unit test (`handler.test.ts:188`).

### Point 4 — blocks inside rich text

- Known, designed, not built. `docs/plans/2026-07-31-core-agnosticism-options-and-value.md` §4.2
  records it; `docs/plans/2026-08-21-translation-mechanism-kernel-extraction.md` ADR-5/8/9/10 and
  §5.1-5.2 design the fix as phase 5 (status: "Implementation pending approval").
- Both rich-text modes walk only `children` and pick `type === "text"`:
  `core/kernel/lexical/collectTextNodes.ts:7-23`, `core/kernel/lexical/collectInlineFragments.ts:193-215`.
  `block` / `inlineBlock` nodes keep data under `fields` and are skipped.
- The schema map drops `editor` on purpose (`core/kernel/field-traversal/projectFieldLike.ts:3-24`,
  `types.ts:35-43`), so the pipeline never sees the `BlocksFeature` block list.
- The fingerprint (`core/domain/content-projection/translatableLeaf.ts:41-49`) uses the same walk — edits
  inside such a block do not trigger auto-translate or a stale badge. The plan requires fixing
  translation and fingerprint together (with a fingerprint migration).
- Write-back already works through the chunk references (`TranslationMutator.ts:48-67`).
- Tests currently lock in the skip: `TranslationPipeline.test.ts:187-250`, `TextChunkExpander.test.ts:377`.
- README does not mention the gap.
- Reproducible in this repo: `apps/cms` Posts `content` with the CTA banner inline block.

## Problem statement

Three separate problems, one integration and two functional:

- **A (point 2).** Since 0.11.1 the translator's own internal reads look like a preview render to any
  plugin that decorates draft reads, so decorated values (invisible markers, `_meta`) are translated
  and written back. Whoever owns the fix, the translator currently trusts that a local draft read
  returns plain content and has no defence when it does not.
- **B (point 3).** Bulk "select all" semantics are unclear to the user and differ from Payload's own
  bulk actions (filter is ignored, access is skipped). The reported "10" is most likely the host's
  job-queue draining, not the plugin.
- **C (point 4).** Text inside Lexical embedded blocks is never translated, silently.

Point 1 is not a translator task (ideal-cms owns its default version).

**Size check:** A, B, C are three independent tasks and should not be one change. C is large
(phase 5 of an existing design, includes a fingerprint migration).

## Proposed scope

IN (as separate tasks):
- A: make the translator's source/target reads unaffected by response-decorating plugins, and/or
  refuse to write values carrying such decoration. Exact approach is an open question.
- B1: confirm the "10" with the reporter; B2: make select-all honour the list's filter and the user's
  read access; B3: say in the UI/README what "select all" translates.
- C: implement phase 5 of the kernel-extraction plan, or, until then, a README known-limitation note.

OUT:
- Changes to ideal-cms's default version (point 1) — report to its owners.
- Changes inside the private visual-editing plugin — can be proposed to its owners, not done here.
- Reverting `draft: true` on the source read.

Non-functional scan:
- Performance — relevant for B: select-all on a big collection enqueues everything; the spend cap
  is unbuilt.
- Security / access control — relevant for B: the select-all lookup bypasses read access.
- Accessibility — N/A.
- i18n — relevant for A: any character filtering must not strip legitimate characters of real
  languages (e.g. zero-width joiners in some scripts).
- Observability — relevant for A and C: both fail silently or with an opaque DB error today.

## Acceptance criteria (draft)

A
1. Given a host plugin that enriches local draft reads unless told otherwise, when a document is
   translated, then the text sent to the model has no characters added by that plugin. (integration test with a stub plugin)
2. The translated value written to the target locale contains no `\u0000`; a model reply containing
   one does not reach the database as-is — it is either cleaned or the field fails with a named reason. (unit test)
3. Negative: a rich-text value arriving with extra root keys (`_meta`) is not persisted with them into the target. (unit test) [inferred — rests on the report's description of `_meta`]

B
4. The reporter's setup confirms where the "10" comes from before any code change for it. (manual)
5. Given a list filtered to N of M documents and "select all N", when translated, then exactly N
   documents are enqueued. (test)
6. Negative: a user without read access to some documents does not get them enqueued by select-all. (test)

C
7. Given rich text with a `block` / `inlineBlock` whose fields are `localized` text, when translated,
   then those fields are translated and the surrounding structure is unchanged. (pipeline test)
8. Editing text inside such a block marks the translation stale. (test)
9. Until 7-8 ship, the README states the limitation. (review)

## Open questions

1. **Who fixes point 2** *[blocking]* — translator-side, visual-editing side, or both? Matters because
   a translator-only fix via visual-editing's `visualEditing: false` context key couples a public
   plugin to a private plugin's internal flag; a visual-editing-only fix leaves the translator open to
   the next decorating plugin.
2. **Nature of the fix on the translator side** *[blocking, if Q1 includes the translator]* — generic
   "internal read" marker in `req.context` that other plugins can respect, vs. cleaning invisible
   characters from strings, vs. both. Cleaning risks removing legitimate characters (i18n).
3. **Point 3: where the "10" comes from** *[blocking for B1 only]* — needs the reporter: how jobs are
   run (autoRun vs cron on `/api/payload-jobs/run`), and the `/enqueue` response `queued` value.
4. **Select-all meaning** *[non-blocking]* — "the whole collection" (today) vs "what the filtered
   list shows" (Payload convention). Recommendation: follow Payload.
5. **Point 4 priority** *[non-blocking]* — build phase 5 now, or ship the README note first.
6. **Point 1** *[non-blocking]* — who tells ideal-cms owners to bump the default version, and to which one
   (depends on Q1: 0.13.x is useless to them until point 2 is solved).
7. **Target read** *[non-blocking]* — the target locale read is also exposed; a tainted target counts as
   "already translated". Must be covered by the same fix as the source read.

Restate check:
- "Select all" — reporter means "all documents in the list"; the code means "all documents in the
  collection, ignoring the filter". Not confirmed which the reporter's list showed.
- "Nested block in rich text" — assumed to be Lexical `BlocksFeature` block/inlineBlock, not a Payload
  `blocks` field. Screenshot not available to confirm.

## Risks & constraints

- `draft: true` on the source read is load-bearing (`b825c4a6`); must stay.
- Point C touches the fingerprint — needs a migration or every translation turns stale at once.
- Existing tests assert the block skip; they are contract tests to be rewritten, not bugs.
- Any change to `/enqueue` body shape is a public API change (README documents it).

## Consistency self-check

- Every IN item has criteria: A → 1-3, B → 4-6, C → 7-9.
- Criterion 3 is marked inferred.
- No criterion requires editing visual-editing or ideal-cms.

## Readiness

- Unresolved blocking questions: 3 (Q1, Q2, Q3).
- IN-scope items without criteria: 0.
- Verdict: **Needs answers first** for A and B1. C and B2/B3 can proceed independently.

## Suggested next step

- A → after Q1/Q2: `/sp-architect`, vector `contract` (boundary between the translator's reads and
  other plugins' hooks on the same local API).
- B2/B3 → `/sp-task`.
- C → `/sp-task` on phase 5 of `2026-08-21-translation-mechanism-kernel-extraction.md` (design exists),
  vectors `data-model` + `evolution` because of the fingerprint migration.
