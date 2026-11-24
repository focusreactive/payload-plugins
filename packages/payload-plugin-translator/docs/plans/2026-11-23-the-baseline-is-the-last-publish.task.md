# The baseline is the last publish

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #3

Builds step 3 of that design, and only the half of it that the fix itself needs. Decision D1
is the settled input; two corrections to it are recorded below.

## Requirements / Task restatement

In a collection with a published layer, auto-translate compares the saved text against the
wrong thing. Payload hands the `afterChange` hook a `previousDoc` that is the latest
*version*, which on a publish is the draft already holding the text being published. The
comparison reads equal, nothing is enqueued, and text that reached the published layer
through a draft save is never translated.

The comparison moves onto the previous **published** version. Nothing else changes.

The design's requirement ids are kept, so this contract traces to it directly.

- R3 (in) The previous published version replaces `previousDoc` as the baseline in a layered collection.
- R4 (in) One stated question is answered: is the source text being published now different from the source text last published?
- R6 (in, part) The entry owns the version-picking read, and asking a collection without a published layer for its previous published version does not compile. The list readers stay where they are — their move waits on the access experiment this design makes it conditional on.
- (out) The analyzer zone confining Payload's version vocabulary to one file · splitting `VersionRead` into two brands · build steps 4–7 · any change to stored shapes.

## What this starts from (measured)

- `AutoTranslateEnqueue.hook.ts:73` passes `previousDoc` to `hasSourceContentChanged`.
- Payload fills that argument at
  `payload/dist/collections/operations/utilities/update.js:395` with `originalDoc`, which
  `updateByID.js:132` obtained from `getLatestCollectionVersion` — the latest version, draft
  included.
- The version row for the save in flight is written before the collection hooks run:
  `saveVersion` at `utilities/update.js:324`, the collection `afterChange` loop at `:386`.
- `hasSourceContentChanged.ts:23` already answers "changed" when there is nothing to compare,
  so the no-previous-publish case needs no code.
- The defect is already pinned red: two cases in
  `apps/dev/src/integration/translator/publishing-what-a-draft-holds.int.test.ts` are marked
  as expected failures, and are the two the integration run reports.
- `payload.findVersions` exists on the local API (3.90.1) and takes `where`, `sort`, `limit`,
  `locale`, `depth`, `pagination`, `overrideAccess` and `req`; it returns rows shaped
  `{ id, parent, version, createdAt, updatedAt }` (`versions/types.d.ts:132`).
- Fixtures for both worlds already exist: `docs` carries `versions: { drafts: true }`,
  `plain` carries no versions.

## Decisions

### D1. The baseline is a field of the layered world, widened at the server entry

- **Chosen:** `worldOfCollection.ts` returns a union whose layered arm carries
  `previousPublished`, built by intersecting the core world's layered arm with that field.
  `src/core/domain/world/` is not touched.
- **Why it bites:** the single-layer arm has no such field, so asking a draftless collection
  for its previous published version is a type error, not a runtime answer. The existing pin
  file proves the same property for `read.published`; a sibling pin proves this one.
- **Rejected — a second type parameter on the core `World`:** it delivers the same guarantee
  and costs a parameter at five production sites and four test files that have no interest in
  a baseline, which is more machinery than it removes.
- **Rejected — a free `previousPublishedOf(payload, slug, id, locale)`:** callable in a
  draftless collection, where it would answer nothing and the mistake would surface only at
  run time.
- **Constraint cited:** the owner's selection rule for this work — a variant adding more
  machinery than it removes is refused on that ground — and the package's rule that
  `src/core` learns nothing about Payload.

### D2. The query filters on published status, and the filter is the decision

- **Chosen:** `{ and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] }`,
  `sort: '-updatedAt'`, `limit: 2`, take index 1. The form Payload uses itself
  (`versions/getLatestCollectionVersion.js:6-18`, published branch).
- **Why index 1:** the row for the save in flight is already written when the hook runs, and
  past the publish gate that row is itself published. Index 0 is this publish; index 1 is the
  one before it.
- **Rejected — an unfiltered newest-first query:** index 1 would be the draft holding the text
  being published, the comparison would read equal, and the defect would survive untouched.
  With autosave the draft row always mirrors the published text, so auto-translate would never
  fire at all. Measured both ways rather than argued: the experiment asserts the unfiltered
  query's index 1 is that draft, and dropping the filter from the shipped read turns AC2 and AC3
  red while every other case stays green.

### D3. The read goes over access control, inside the caller's transaction

- **Chosen:** `overrideAccess: true`, and `req` carrying the transaction id through
  `freshReq(scope)`, in the source locale, at `depth: 0`.
- **Why:** the version is shown to nobody — two fingerprints are compared inside the plugin —
  and the editor's right to the document was settled by the save itself. The transaction is not
  a preference: the row for the save in flight is uncommitted, so a read outside the
  transaction cannot see it.
- **Rejected — reading as the editor:** a host restricting version reads would hide the
  baseline, the plugin would read "no previous publish" and translate on every publish,
  spending money for a permission question that was already answered.
- **Constraint cited:** the sibling adapters in the same folder take `{ payload, collection,
  id, locale, scope }` rather than a `PayloadRequest`, because Payload reuses one request
  object across the documents of a bulk update (`RequestScope.shapes.ts:6-7`).

### D4. Corrections to the design this builds from

- D1 of the design names `versionRead.ts` as the entry. That file does not exist; the entry is
  `src/server/shared/payload/worldOfCollection.ts`.
- D1 describes a free function `previousPublishedOf(...)`. It is a field of the layered world
  instead, for the reason recorded in D1 above.

### D5. Clauses of the inherited design deferred rather than built

- The analyzer zone confining Payload's version vocabulary (design D6) — the fix ships alone,
  because its only unrecoverable cost is provider spend.
- The list readers moving onto the entry — the design makes that conditional on an experiment
  about host access rules which has not been run.

**New surface:** one field on the type `worldOfCollection.ts` already returns, plus the named
ask it takes. Shape check fired on "a field is added to a type"; two shapes compared in D1.
**Written contract owed:** yes — `previousPublished` owes its caller facts no signature states
(which version it answers with, what `null` means, that it must run in the caller's
transaction).
**Escalate:** no — build step 3 of an adopted design.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R6 | At the hook's moment, the filtered query returns the in-flight publish at index 0 and the previous publish at index 1, in the source locale | the step-0 experiment test, asserting both rows' text | **fails now** — no such read exists |
| AC2 | R3 | A document first saved as a draft and published afterwards is translated | `publishing-what-a-draft-holds.int.test.ts`, case 1, as an ordinary `it` | **fails now** — flipped to `it` and run: `expected +0 to be 1` at line 45 |
| AC3 | R3 | An edit saved as a draft on an already published document is translated when published | same file, case 2, as an ordinary `it` | **fails now** — same run: `expected +0 to be 1` at line 70 |
| AC4 | R4 | Republishing with no change to translatable text enqueues nothing | new case, provider call delta 0 | **passes now** — a stays-true criterion |
| AC5 | R4 | A draft written, reverted to the published text, then published enqueues nothing | new case, provider call delta 0 | **passes now** — stays-true |
| AC6 | R4 | A baseline row created by the plugin's own target-locale publish does not change the answer | new case, provider call delta as for an editor publish | **passes now** — stays-true |
| AC7 | R3 | A collection with no published layer still translates on every qualifying save | the existing `plain`-collection coverage | **passes now** — stays-true |
| AC8 | R6 | `previousPublished` on a single-layer world fails `check-types` | a pin file beside `singleLayerHasNoPublished.pins.ts`; plant the access, require an error naming the pin file, revert | **fails now** — the field does not exist |
| AC9 | — | The baselines hold | `bun run check-types` 0 errors · `bunx oxlint .` 26 warnings 0 errors | **passes now** — measured |
| AC10 | — | The suites hold, with the two expected failures gone | `bunx vitest run` ≥ 3045 passed · integration 280 passed, **0** expected failures, 7 skipped | **passes now at 3045 / 278 + 2 expected failures** |

AC2 and AC3 are the original reproduction: a bug's criterion that it no longer reproduces.

## Risk

**High.** The change sits in a hook that runs on every save of every managed collection, and
it decides when money is spent at the translation provider. The two failure directions are
unequal: reading the baseline wrongly in one direction loses text silently (today's defect),
in the other it pays for a translation on every publish. Neither is visible to a unit test —
both need a real Payload boot, which is why AC1–AC7 are integration criteria.

No stored shape changes, so rollback is a revert and the only unrecoverable cost is provider
spend already incurred.

The load-bearing unknown is AC1: the ordering and visibility were established by reading
Payload's source, not by running it. If the experiment contradicts it, the work stops and the
shape is reconsidered rather than patched.

Two risks surfaced by review. Both are closed — the first by taking the platform's own answer, the
second by measuring it.

- **A tie on `-updatedAt` — closed by taking the platform's own answer.** Index 1 is the previous
  publish only while published rows carry strictly increasing timestamps. Two publishes of one
  document inside one transaction in the same millisecond would tie, and if the in-flight row came
  back second the baseline would equal the document and the translation would be skipped — the
  losing direction. The exposure is Payload's rather than this plugin's: the admin names the current
  publish with the same query this read uses, as do `getLatestCollectionVersion` and the unpublish
  and autosave paths, and the `latest` flag marks the newest version of any status rather than the
  published one, so it cannot stand in for the filter. Ordering published rows more strictly here
  would make the plugin disagree with what the admin shows for the same document. The Payload files
  are named in the header of `version-history-at-the-hook.int.test.ts`.
- **A pruned history — measured, and far narrower than it read.** D1 decided a missing previous
  publish reads as "changed", erring toward spending rather than losing text. What that left open is
  how often the previous publish is actually gone: `versions.maxPerDoc` retains the newest rows and
  deletes the rest by age, Payload injects a default of 100 (`collections/config/sanitize.js:172`)
  and the reference app sets 50, and this plugin writes three version rows per target locale into
  that same history. Measured rather than argued, in
  `apps/dev/src/integration/translator/how-deep-the-baseline-sits.int.test.ts`: the baseline sits
  three rows from the newest and stays there however long the document's history grows — it is the
  plugin's own last target-locale publish, itself a published row, so the distance does not grow with
  the number of targets either. Pruning reaches it only below `maxPerDoc: 3`. One thing does push it
  deeper, a row per hand-saved draft, so roughly `maxPerDoc` draft saves between two publishes of one
  document would buy a translation of unchanged text. Nothing was changed for this: the cost is
  provider spend in a case the measurement puts out of ordinary reach.

## Decisions by the owner

- 2026-11-23 — the baseline is a field of the layered world rather than a free function,
  because an illegal question should be impossible to write rather than caught while running.
- 2026-11-23 — the previous published version is read over access control, because it is
  shown to nobody and the editor's right to the document was settled by the save itself.
- 2026-11-23 — the analyzer zone confining Payload's version vocabulary ships as its own
  change after this one, so the fix travels alone.
- 2026-11-23 — a tie between two published rows carrying the same timestamp is accepted as the
  platform's behaviour rather than corrected here, because the admin identifies the current publish
  the same way and a stricter order would make the plugin disagree with what an editor is shown.
- 2026-11-23 — a pruned history is closed by measurement rather than by a change. Reading the
  baseline from version history makes it depend on the host's retention setting, which is a storage
  decision this plugin has no business steering; advising a host to raise or disable `maxPerDoc`
  would move the cost of our defect onto them, and the plugin is itself the heaviest writer of the
  rows that setting trims. The measurement showed there is no defect to move: the baseline stays at
  a fixed, small distance from the newest row.
- 2026-11-23 — what this read assumes about Payload is recorded as a platform assumption proved by
  a test, not as one of the rules the entry derives from the host's configuration. No host setting
  decides it and none can override it; it would move only if Payload changed how it stores and
  orders versions. For the same reason it earns no table of its own: the test that proves the
  assumptions is where a reader finds them.
