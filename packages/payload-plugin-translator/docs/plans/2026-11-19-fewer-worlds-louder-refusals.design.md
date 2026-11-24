# Architecture Design — fewer worlds, louder refusals

**Date:** 2026-11-19 · **Status:** designed (forward architecture, three candidates + adjudication);
implementation pending approval. · **Branch:** `major/translator`.

**Method:** landing-site map → three candidate designs, one per data-model priority (one fact in one
place · shape for the read · record events and derive) → adjudication against the invariants of every
loaded vector, with each candidate replaying the measured defect against itself.

### The ask (ground truth)

The plugin states which host configurations it supports, refuses the rest where the configuration is
written, and never lets a configured feature silently do nothing.

Almost every fork in the plugin grows from three switches in the host's config — drafts, autosave and
translation receipts — which multiply into eight worlds. About two are honestly tested, and a defect
lived in one of the untested ones for months.

**Revised 2026-11-20, owner review.** Two of those three switches leave the decision altogether. D1
makes receipts irrelevant to the enqueue decision, and `autosave` was measured to change nothing on the
auto-translate path. What remains is **one axis with two values**: a collection has a published layer,
or it does not. The revisions and their evidence are recorded at the end of this document.

- R1 (in) The supported set of configuration worlds is named in one place and decided once.
- R2 (in) An unsupported combination refuses where the configuration is written, naming the
  collection, what is unsupported, and the way out.
- R3 (in) Text that reaches the published row through a draft save is auto-translated.
- R4 (in) The auto-translate change check asks one stated question; that question governs money spent
  at the translation provider.
- R5 (in) The version a run reads is decided where the run is admitted and travels with it.
- R6 (in) One named entry answers "which version of a document do we read"; `visibleIds` and
  `getAllCollectionIds` go through it.
- R7 (in) The admin offers nothing the server cannot answer.
- R8 (in) Nothing cut becomes a silent no-op; every cut is a refusal or a visible statement.
- R9 (in) Whether the provenance key needs a draft/published dimension is decided and recorded.
- R10 (out) a separate draft-translation path · rich-text container mode · removing the admin stub ·
  changes to `src/types/wire/*` · migrating existing installs' data.
- R10 was **narrowed by the owner on 2026-11-20** for one field: `publish_on_translation` is removed
  from `ActionBodies.ts` as well as refused at the route (D8).

**Vectors:** structure + data-model + evolution (leading: data-model) — data-model because the
question under every fork is what a receipt means and what the change check compares against, which is
identity and authority; evolution because cutting worlds breaks installs that work today and cannot be
undone by reverting one commit. Concurrency had a real signal (`admitWork` drops busy work; a run
reads at execution) and lost the third slot to the hard cap; it rides in as decision points D4 and D7.
Stack pack: headless-cms.

### The defect this design starts from

Measured in `apps/dev`, sqlite, drafts on, `targets: ["de"]`, counting provider calls:

| | the editor does | what the hook sees | calls |
|---|---|---|---|
| 1 | creates as a draft, then presses Publish | save 1 is `_status: "draft"` and the publish gate turns it away; save 2's `previousDoc` is the draft that already holds the text, so the change check turns it away | **0** |
| 2 | published document, edit saved as a draft, then Publish | the same two refusals | **0** |
| 3 | types text straight into a publishing save | the gate passes; `previousDoc` is the older published row | 1 |
| 4 | control: published → changed → published | as 3 | 1 |

Root cause, confirmed in Payload 3.90.1: `afterChange`'s `previousDoc` is `originalDoc`, which comes
from `getLatestCollectionVersion(...)` (`update.js:380-397`, `updateByID.js:132`) — the latest version,
draft included. **Autosave is not required for the defect.** Any drafts collection has it the moment an
editor presses "Save draft" before "Publish", which is a button Payload's own admin offers. Autosave
only makes it the normal case.

`README.md:103` and `:239` promise that auto-translate "waits until the document is published". It does
not wait; it never fires. Closing this gap therefore **restores a documented promise** and is a fix,
while cutting worlds breaks working installs — two different kinds of change that must not share a
commit.

### Decision points

- D1 [load-bearing] What the auto-translate change check compares against (axis: read-write-paths · reversible)
- D2 [load-bearing] What a supported world is as a type, and which worlds survive (axis: entities-schema · reversible in code, irreversible for hosts once released)
- D3 [load-bearing] Where an unsupported world is refused, and in what form (axis: rollout-sequence · reversible)
- D4 [load-bearing] Whether a run carries the version that triggered it (axis: read-write-paths · reversible)
- D5 [load-bearing] Whether the provenance key gains a draft/published dimension (axis: entities-schema · reversible)
- D6 [load-bearing] The one named entry for "which version do we read" (axis: placement · reversible)
- D7 [load-bearing] What happens to a save dropped because a run is live (axis: ownership-lifecycle · reversible)
- D8 [minor] Whether a manual run publishes (axis: ownership-lifecycle · reversible)
- D9 [load-bearing] How the cut reaches hosts that work today (axis: compatibility-window · reversible)

D4 and D5 entered the fan-out as one-way doors — a column on the run row and a unique-index change on
a table with data behind it. **Neither is taken.** The design has no point of no return.

### How it lands on the system

**The measure.** Twenty-seven places in `src/` branch on drafts, autosave or receipts: nine explicit
drafts/autosave decisions, six reads that pick a version, twelve on receipts. The count is the yardstick
for whether this work simplified anything.

**Reuse.** `resolveTargetLayer` (`targetLayer.ts:25-52`) is the only place that turns `versions` into a
decision today, and its union — `publish` exists only on the `drafts` variant, because
`publishSpecificLocale` on versions-without-drafts silently drops every other locale — is the house
template for making an illegal world unrepresentable. The refusal shape already exists twice:
`assertProvenanceSlugFree` (`provenance/slugGuard.ts:10-20`) and `assertRunRecordSlugFree`
(`runs/slugGuard.ts:8-18`), each a pure assert wrapped in a `ConfigModifier` throwing
`TranslatorConfigError` with a message naming the option to change. `config.onInit` is already chained
by this package (`PayloadJobsRunnerProvider.ts:117`), with a test pinning that a host's own `onInit`
survives. The repo's `oxlint.config.ts` enforces import boundaries per glob, so "one file may hold this
literal" is a lint rule rather than a convention.

**Touched.** `src/server/modules/auto-translate/` (hook, policy, wiring) · `src/server/shared/payload/`
(`sourceDocument.ts`, `localesHoldingContent.ts`, `collections.ts`) ·
`src/server/features/translate-document/` (`targetLayer.ts`, `targetDocument.ts`, `translateDocument.ts`,
`run.ts`, `selectLeaves.ts`) · `src/server/features/enqueue-translation/` · `src/composition/modules/` ·
`src/plugin.ts` · new `src/core/domain/world/`.

**Not touched.** `src/types/wire/*` (frozen by R10) · the provenance table's shape · the run row's shape.

### The design

**Abstractions.**

- `HostWorld` + `resolveWorld(switches) → Supported | Refusal` — payload-free, on plain booleans,
  in `src/core/domain/world/`. The core lint zone bans `payload/*`, so the switches arrive as booleans
  and the Payload reading happens in the adapter below. Callers: the config-time refusal, the boot
  re-check, and the auto-translate hook — which asks the same question today at
  `AutoTranslateEnqueue.hook.ts:70`. ST1 satisfied with an existing caller.
- `SUPPORTED_WORLDS` — a table, not a chain of `if`s. Each listed world carries a `provedBy` test path,
  and a meta-test fails when a world is listed as supported with no named proof. This is what turns
  "supported" from a claim into something a suite can falsify, which is the thing the ask says is
  missing.
- `worldOfCollection(collection)` — `src/server/shared/payload/`, the only file permitted to import
  `hasDraftsEnabled` / `hasAutosaveEnabled` from `payload/shared`. `resolveTargetLayer` stops calling
  them and takes the world, keeping its union.
- `versionRead.ts` — `src/server/shared/payload/`, holding `VersionAsk = "latest" | "published"`,
  `readArgsOf(ask)` and `previousPublishedOf(...)`. The only file containing the `draft: true` literal,
  which is duplicated today at `sourceDocument.ts:7` and `localesHoldingContent.ts:8`.
- `RunIntent` — `{ read: "latest", publish: false }` (manual) | `{ read: "published", publish: true }`
  (auto). The illegal pairs are unrepresentable (DM6). It travels on the task input, not on the run row.
- `AutoTranslateOutcome = enqueued | skipped(reason) | failed(error)` — the hook's inner function
  **returns** it, so a path that names no outcome does not compile.

**Dependency direction.** `src/server/modules/auto-translate` → `src/server/shared/payload` →
`src/core/domain/*`; `src/core` reaches nothing. No edge from auto-translate to provenance — that
absence is what keeps receipts optional. No cycles: the run-end reconciler that would have created one
is not built.

**Placement.** The world union and its table → `src/core/domain/world/`; the Payload adapter →
`src/server/shared/payload/worldOfCollection.ts`; the read entry →
`src/server/shared/payload/versionRead.ts`; the refusal → a `ConfigModifier` in
`src/server/modules/auto-translate/`, registered **first**, before the chain `setup()` loop at
`plugin.ts:290` and before the hook injection at `:294`, which mutates host collection objects in place.

**Data flow & ownership — three facts, three owners (ST4, DM1).** The **registered collection config**
is the only source of truth for which world a collection is in; nothing is stamped on `custom` for it.
The **published version row** is the authority for "has the source text moved". The **receipt** remains
a record of what each target was made from and is never read by the money gate. The **run record** stays
the authority for what was attempted.

**data-model.** Schema delta: **none** — no new column, no index change. Ownership: a receipt is written
only by a run; the run row only by the plugin. Read-write paths: every version-picking read goes through
`versionRead.ts`; the baseline costs one `findVersions` per qualifying publish save, and zero in the
no-drafts world. Migration: nothing to migrate; existing receipts keep their meaning exactly.

**evolution.** Rollout: seven steps, the R3 fix first and alone. Compatibility window: one — job rows
queued before the intent ships, read as `latest` at a single parse site that is also the removal site.
Reversibility: every step reverts by reverting its commit; there is no one-way door. Cleanup: the intent
shim and `publish_on_translation` each get a ledger entry with a trigger query.

### Requirement coverage

| R | Design element |
|---|---|
| R1 | `SUPPORTED_WORLDS` in `src/core/domain/world/`, with the `provedBy` meta-test |
| R2 | `refuseAnUnsupportedWorld`, registered first, throwing `TranslatorConfigError` naming collection · what is unsupported · the way out |
| R3 | `previousPublishedOf()` replaces `previousDoc` as the drafts-layer baseline |
| R4 | One stated question: *is the source text being published now different from the source text last published?* |
| R5 | `RunIntent` resolved at admission, carried on the task input, read by the executor |
| R6 | `versionRead.ts`; the list readers move onto it once their semantics are pinned |
| R7 | route-derived abilities, plus an unsupported world cannot boot, plus the `stale` criterion refused at admission instead of throwing at `selectLeaves.ts:36` |
| R8 | config-time throw · boot throw · a named hook outcome on every path · 400 on `publish_on_translation: true` · 400 on a publish request in the no-drafts world · zero surviving target locales becomes a refusal |
| R9 | decided: **no dimension**, recorded with the condition that forces revisiting |

### Vector gates

- **structure** — no candidate decision survives that breaks ST1–ST6; every new abstraction has at
  least one caller that exists today.
- **data-model, the existing-data gate** — nothing in this design changes a stored shape. Existing
  receipts keep their exact meaning, having never been the money authority. Existing run rows are
  untouched. The one old/new coexistence is a job row queued before the intent ships: new code reads it
  as `{ read: "latest" }`, old code ignores an unknown key on a JSON input. Both directions stated (EV5).
- **evolution, the rollback gate** — every step reverts by reverting its commit; **no point of no
  return**. The irreversible options were rejected, not excused. The only thing a revert cannot undo is
  provider money already spent, which is why the R3 fix ships alone with its trace test as the gate.
- **headless-cms** — HC1 is honoured: no stored shape changes, so no published entries need converting.
  HC4 is advisory here (security is not a loaded vector) and is recorded under risks: D4 closes the case
  where a published translation could be made from unpublished text, and D6's list move exposes
  draft-only document *ids*, not content, to callers already behind the status guards.

### Decisions (ADRs)

#### D1. The change check compares against the previous published version

- **Context:** `previousDoc` on a publish is the draft that was just published, so the fingerprints match
  and nothing is enqueued (`hasSourceContentChanged.ts:22-28`). The version row for the save in flight
  already exists when the hook runs — `saveVersion` is called at `update.js:324` and the collection
  `afterChange` hooks at `:386` — so the previous published version is readable with one
  `payload.findVersions` (confirmed present on the local API in 3.90.1).
- **Options considered:**
  - the **previous published version**, by a query filtered on published status (normalize-first; the query is written out in the decision)
  - **the receipt** — enqueue every target whose stored fingerprint differs from the published doc (read-optimized)
  - **a receipt log** with a draft/published dimension and a fold for the head (append-only-log)
- **Decision:** the previous published version, read by a query **filtered on published status**:
  `{ and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] }`, `sort: '-updatedAt'`,
  `limit: 2`, index 1 — the form Payload uses itself (`versions/getLatestCollectionVersion.js:6-18`).
  **The filter is the decision, not a detail.** An unfiltered newest-first query returns draft rows too,
  so index 1 is the previous *version*; in the measured sequence that is the draft holding the text
  being published, the comparison is equal, and the defect survives untouched. With `autosave` — now a
  supported world (Revisions R-1) — the draft row always holds exactly the published text, so an
  unfiltered query would mean auto-translate never fires on any document edited in the admin. Traced as
  seam-trace finding 1. Both receipt options are rejected because they create a
  **new** silent no-op, which is the one thing R8 forbids: an editor edits the draft, a manual run
  translates from the latest and upserts the receipt with the hashes of that text, the editor then
  publishes the same text, the gate compares equal — and the *published* target row still holds the old
  translation. One receipt row carrying two meanings is DM1 and DM6. The published baseline needs no
  second store, so the enqueue decision stays a pure function of an authority Payload already keeps
  (ST4, DM1), and `provenance` stays optional — which is what keeps every existing host working,
  `apps/cms` included (EV5).
- **Consequences:** one extra `findVersions` per qualifying drafts publish, zero in the no-drafts world
  — at the stated budget, not under it. With no previous published version (first publish, or
  `maxPerDoc`, default 100, has pruned it) the answer is "changed", erring toward spending money rather
  than losing text, which matches the existing `!previousDoc` rule. The baseline row may be one the
  plugin itself created when publishing a target locale; its source-locale content equals the previous
  editor publish, so the answer is unaffected — but nobody designed for it, so it is pinned by a test.
  What this design **cannot** answer and the receipt options could: *this target failed, was dropped, or
  never existed*. A failed run is visible in the run record and the admin; a newly added target locale is
  not backfilled until the source text moves, which is unchanged from today (see Open questions).
- **Reversible:** yes — one function, no stored shape.
- **Guarded by:** an integration test replaying the four measured steps and asserting 1/1/1/1 provider
  calls plus **0** for a republish with unchanged text, added in build step 3 — the step that makes it
  pass; plus D6's lint zone keeping every version-picking read inside one file.

#### D2. A supported world is a union plus a table whose every row names its proof

- **Context:** three switches, eight worlds, about two tested. `bootTestPayload.ts:219` hard-codes
  `provenance: true`, so every auto-translate integration test runs with receipts on, while the unit
  hook tests build the hook with no provenance dependency — "auto-translate works without provenance" is
  pinned only by accident.
- **Options considered:**
  - a world union with ten of twelve cells supported, refusing only autosave + auto-translate (normalize-first)
  - **the owner's revision (2026-11-20): two rows, no autosave refusal** — see the Revisions section
  - receipts always on, `provenance: false` refused and an omitted option re-read as on (read-optimized)
  - a closed union **plus a table whose every row carries a `provedBy` test path**, enforced by a meta-test (append-only-log)
- **Decision:** the union shape, with the table and meta-test grafted in. R1 asks for the supported set
  to be named in one place; `provedBy` turns "supported" into a claim a test can fail, which is exactly
  what is missing today (ST5). Receipts stay **optional**: refusing an explicit `provenance: false` would
  be loud, but re-reading an *omitted* option as "on" changes behaviour for every existing host in
  silence — R8 and EV5, and the same defect the ledger's `strategy` entry exists to forbid.
  **The autosave refusal is withdrawn (2026-11-20).** It was admitted for lack of proof rather than for
  breakage; the owner challenged that, and the two mechanisms it could have rested on were measured and
  found absent (Revisions R-1). A refusal with no mechanism under it is a cut for its own sake, so
  autosave is supported with a named proof like any other row. The table therefore carries **two rows,
  not twelve cells**: a collection has a published layer, or it does not. `autosave` and `provenance` are
  not axes of it, and the table says so in a line, or the fork count grows back.
- **Consequences:** the table is now a statement of two shapes plus the proofs for each, and the
  meta-test demands two integration boots that do not exist today: `provenance: false`, and autosave with
  `withAutoTranslate`. The table must still be exhaustive over every switch that changes the meaning of
  `doc._status`, which is the field the publish gate reads — and two such switches have no row yet (see
  Open questions, closed below). **`localizeStatus` is the refused row** and `schedulePublish` a
  supported one, so R2's machinery (D3) has a world-shaped customer as well as the surviving config-time
  guards — duplicate names, unusable config, zero surviving target locales.
- **Reversible:** no — not for hosts once released: a host in a refused world cannot boot, and
  re-admitting a world takes another release. In code it is one row of a table, and the way back is
  named in that row: make an integration test green and flip it. With no world refused today, nothing
  irreversible ships from this decision until a row is set to refused.
- **Guarded by:** the `provedBy` meta-test — a world listed as supported with no named proof fails the
  suite. Added in build step 5.

#### D3. The refusal is three layers, because each sees a different object

- **Context:** plugins run before sanitize (`config/build.js:7-15`), so the object a config-time refusal
  reads is raw and may not be the registered one. This is not hypothetical: `apps/cms` passes
  JSON-cloned collections with functions stripped, and a sibling plugin **in this repository**,
  `payload-plugin-scheduling`, rewrites `versions.drafts` on host collections
  (`injectSchedulePublishToVersions.ts:9-12`) — it can move a managed collection from the no-drafts
  world into the drafts world *after* the translator's refusal has read it, and it returns a new object.
- **Options considered:**
  - a config-time throw alone — rejected: blind to everything above
  - a config-time throw plus a boot re-check (all three candidates)
  - the pair plus a third, runtime layer (this design)
  - **the same three layers, but boot refuses the plugin's own surface instead of the host's process** — the owner's decision, 2026-11-20, after the seam trace
- **Decision:** all three layers, each with the additions the candidates contributed.
  1. **Config time** — `refuseAnUnsupportedWorld` registered first, throwing `TranslatorConfigError`
     naming the collection, what is unsupported and the way out. This is "where the configuration is
     written" and is what satisfies R2.
  2. **Boot (revised 2026-11-20) — re-resolve, and refuse *our* surface, not the host's process.**
     Re-resolve from `payload.collections[slug].config`, assert the marked hook is present, and on a
     refused world log an error naming the collection and mark that collection refused for this process.
     It does **not** throw. The earlier decision was to throw, and the seam trace priced it: an `onInit`
     throw fails `payload.init`, so every collection of the host answers 500 — `users` and `media`
     included — and nobody can sign in, over a collection the host may not even be translating. Worse,
     on a serverless deploy `onInit` runs on the first cold request, so the deploy is green and the
     refusal arrives later as scattered outages (seam-trace finding 5). The blast radius is not ours to
     take. Loudness is kept where it belongs: the plugin's own state reads answer a refusal naming the
     collection and what is unsupported — one more sentence beside `NOT_MANAGED` and `NO_LOCALIZATION`
     in `shared/http/readRefusals.ts`, which the admin already renders, so this needs no new wire
     surface — and the hook refuses as layer 3. Layer 1 is unchanged and remains the hard failure: a
     world the host itself wrote still stops the application before it serves, which is the right moment
     and the right audience. Layer 2's limit is unchanged — `disableOnInit` and the same-config cache can
     skip it — which is why layer 3 exists.
  3. **The hook** — re-derives the world from its own `collection` argument, as it already does, and in
     a refused world returns `skipped(unsupported-world)`. It cannot throw: the hook never fails the
     editor's save.
  Also folded in: `plugin.ts:134-169` moves onto `TranslatorConfigError` so refusal has one class;
  `dropLocalesTheProjectDoesNotHave` becomes a refusal when **zero** target locales survive and stays a
  warning when some do; nothing is stamped on `custom` for the world (ST4).
- **Consequences:** a host whose own config names a refused world still cannot start — layer 1, at the
  moment the configuration is read. A host whose world is changed by a *later* plugin keeps running:
  that collection is refused by the plugin and says so where someone looks, while the rest of the host
  is untouched. The cost of the change is that the second case is no longer impossible to miss; it is
  merely visible in two places, the server log and the admin's own refusal. That is the trade the owner
  took, and the reason is proportionality rather than volume.
- **Reversible:** yes, per layer.
- **Guarded by:** an oxlint zone making `worldOfCollection.ts` the only file permitted to import
  `hasDraftsEnabled`/`hasAutosaveEnabled`, added in build step 5, plus one test per layer: a config-time
  throw, a boot run that refuses without throwing and leaves an unmanaged collection working, and a state
  read answering the refusal sentence.
  The zone must be appended after the existing translator zones and restate the core boundary rules it
  overlaps — options replace and the last matching override wins, so a carelessly placed zone would
  silently switch the core boundary off.

#### D4. The run carries its intent on the task input, not in a new column

- **Context:** the hook gates on a published save, but the run reads `draft: true` at execution
  (`targetDocument.ts:139`) and may then publish (`translateDocument.ts:104`) — so a published
  translation of unpublished text is reachable today, and debounce widens the window.
- **Options considered:**
  - a **run-row column** `sourceVersion`, NOT NULL with a default (normalize-first) or nullable (read-optimized)
  - the intent on the **task input only** — Payload's jobs input is a JSON column, so no migration (append-only-log)
- **Decision:** the task input, with the `RunIntent` union from the first candidate. Nothing reads such
  a column — the executor reads the intent off the task input, and the run row exists for status and
  cancellation — so adding one would be a schema field kept that nothing reads, bought with a SQL
  migration in `apps/cms` (DM3, EV1). The union makes the two legal combinations the only representable
  ones (DM6). This answers the objection outright: the auto path can never translate unpublished text,
  and the manual path never publishes.
- **Consequences:** `publish: true` means "publish if there is a layer to publish into" — the no-drafts
  world has none, and `publishIfAsked` (`translateDocument.ts:45-48`) is the single place holding that,
  guarded by `resolveTargetLayer`'s union (seam-trace finding 2). The intent-less legacy row normalises
  from `publishOnTranslation`, which the row already carries, rather than defaulting to manual (finding
  3). `read: "published"` resolves **at execution**, so with a debounce a run may translate
  a *newer* published row than the one that triggered it. That is deliberate, and it is what makes a save
  dropped against a not-yet-read run covered by that run (D7). A `published` run whose document is no
  longer published at execution **fails visibly** rather than silently falling back. `README.md:273`
  becomes wrong for the auto path and is corrected in step 7. `publishOnTranslation` becomes derivable
  from the intent; it is kept as the record of what the run did, with a removal trigger.
- **Reversible:** yes — and that is the point of this graft; the column version was not.
- **Guarded by:** the union itself, checked by the type-checker (an illegal pair does not compile), plus
  a contract test that a job input carrying no intent parses to `{ read: "latest" }` at exactly one site
  — added in build step 4, which is also the shim's removal site.

#### D5. The provenance key gains no dimension

- **Context:** receipts are written at execution from the `draft: true` read, so a receipt can record the
  newest draft rather than the published row. The unique key is
  `(collectionSlug, documentId, targetLocale)` (`Provenance.collection.ts:33`), a real SQL table with
  migrations behind it in `apps/cms`.
- **Options considered:**
  - **no dimension**, accepting that a manual run can overwrite an auto run's receipt (normalize-first)
  - **no dimension**, because the stored fingerprint is content-derived and so version-independent (read-optimized)
  - **a `readVersion` dimension**, the unique index dropped, append and prune (append-only-log)
  - **a four-column unique key** with two upserted heads and no history — named by the log candidate itself as its own better alternative
- **Decision:** no dimension — for the second candidate's reason, not the first's shrug. Because D1 does
  not read the receipt, the receipt is asked only one question: *what text was this target made from?*
  The stored hashes answer that truthfully whichever layer they were read from, so the row carries one
  fact with one meaning (DM1) and there is no illegal state to exclude (DM6). The log form is
  disqualified under DM4 and DM3: history nothing reads, and a down migration that must deduplicate is
  not a rollback. The four-column key is **correct and unnecessary here** — it is the right answer only
  if the enqueue decision ever reads the receipt.
- **Consequences:** a manual run and an auto run on one (document, locale) still overwrite one receipt,
  last write wins, and the row always names what the latest write read. The admin's badge can therefore
  read "current" for a locale whose *published* row is behind, when a manual draft-sourced run was the
  last writer. That is a display inaccuracy, not a money or correctness defect, because the gate does not
  read it. **The trigger that forces revisiting this: any change that makes the receipt an input to the
  enqueue decision, or to a claim about the published layer.**
- **Reversible:** yes — nothing is built; the rejected options were the irreversible ones.
- **Guarded by:** a test asserting the auto-translate hook enqueues with `provenance` **off** — the
  mechanical check that keeps the receipt out of the money path, which today's suite pins only
  implicitly. Added in build step 3.

#### D6. One read entry, and the list readers move only once their semantics are pinned

- **Context:** the same `{ draft: true, fallbackLocale: false }` literal is duplicated at
  `sourceDocument.ts:7` and `localesHoldingContent.ts:8`, while `visibleIds` and `getAllCollectionIds`
  (`collections.ts:11,33`) pass no `draft` at all — so the list decides visibility on the published row
  while the document read decides it on the draft.
- **Options considered:**
  - one entry, with the list move **gated** on an integration test pinning what Payload actually does (normalize-first)
  - one entry, moving the lists and **asserting** the semantics are safe (read-optimized)
  - one entry, with a contract test against a host rule that denies non-published rows (append-only-log)
- **Decision:** the gate, with the adversarial host rule as the test's content. The instruction is to
  guess at nothing, and the semantics are genuinely non-obvious: `draft: true` routes `find` to
  `db.queryDrafts`, which queries the **versions table** filtered `latest: true` with the host's access
  `Where` rewritten key by key (`version.<k>`, `id` → `parent`). So the host's `read` rule is evaluated
  against the latest version row's values — precisely the security concern, asserted by one candidate
  rather than pinned.
- **Consequences:** if the pin shows a host rule answering differently, the two list readers keep
  `"published"` **through the same entry**, so R6 holds either way and only one line differs. If it
  passes, lists expose draft-only document *ids* — not content — to callers already behind the
  `collection-status` / `document-status` guards.
- **Reversible:** yes — the ask is one argument at one call site, which is why the entry ships before the
  move.
- **Guarded by:** an oxlint zone permitting the `draft: true` literal only in `versionRead.ts`, added in
  build step 1, plus the pin test added in step 2.

#### D7. A dropped save becomes a named outcome, not a catch-up run

- **Context:** `admitWork` drops a save against a live run, the hook only warns, and nothing catches up —
  in every world, today.
- **Options considered:**
  - no catch-up; D4 narrows the loss and the rest becomes a named outcome (normalize-first)
  - no catch-up, relying on a level-triggered receipt check to re-fire (read-optimized)
  - a run-end reconciler, bound through composition to avoid a cycle (append-only-log)
  - preserve the intent at drop time as a durable "owed" marker a run-end sweep reads — raised at adjudication, proposed by no candidate
  - **a re-check at the end of the run, from the baseline already in the run's own memory** — the owner's decision, 2026-11-20, after the seam trace
- **Decision (revised 2026-11-20, after the seam trace):** the named outcome **and** a re-check at the
  end of the run. When a run finishes writing, it re-reads the published source and compares it with the
  text it translated; if they differ, something was published while it was working, and it enqueues once
  more. The level-trigger stays unavailable by construction — it belongs to the receipt-authority D1 that
  was rejected. The durable "owed" marker stays rejected: it adds a stored fact. **What changed is the
  weight of the hole, not the cost of the cure.** The trace showed the dropped save is not merely
  invisible but *unrecoverable*: the plugin's own locale publish writes a version row carrying the
  current source text, so from then on re-publishing the document compares equal forever and the text is
  never translated, however many times the editor tries (seam-trace finding 15). At that weight the
  dependency cycle is no longer a sufficient reason to refuse. The cure needs **no stored state**: the
  baseline it compares against is the text the run already holds in memory, so it works with receipts off
  — which is exactly the configuration where the loss is otherwise invisible.
- **Consequences:** the loss is narrower than today — with D4, a save dropped against a run that has not
  yet read is covered by that run, because the run reads the published row at execution. The residual is
  a save dropped against a run that has **already** read — and that is what the end-of-run re-check now
  covers. Three costs, named: one extra read per run, not per save; a **cap on chained re-enqueues**, or
  a continuously publishing editor chains runs without end; and a path from the executor back to the
  enqueue side, which is the cycle the earlier reconciler option was refused for — broken through
  composition, as this package already does for the jobs runner (`PayloadJobsRunnerProvider.ts:117`).
  What the re-check still does **not** cover: a process that dies mid-run, which leaves a failed run row
  and is a different hole. With k target locales a publish creates k live runs and the document stays
  busy for the length of the slowest, so without this re-check the drop would be the ordinary case rather
  than the residual one (seam-trace finding 9).
- **Reversible:** yes — one re-read and one conditional enqueue, no stored shape.
- **Guarded by:** the hook's inner function **returns** `AutoTranslateOutcome` instead of `void`, so a
  path that names no outcome does not compile and the single logging site cannot be bypassed (build step
  6); plus an integration test replaying seam-trace finding 15 — publish, publish again while the run is
  reading, and assert the second text reaches the target locale — and a test that the chain cap holds
  (build step 7).

#### D8. A manual run never publishes

- **Context:** the admin already stopped sending `publish_on_translation`, but the route still accepts
  it, and `README.md:267` documents the no-drafts case as doing "nothing, silently" — one of the eight
  worlds, and exactly what R8 forbids.
- **Options considered:**
  - refuse `publish_on_translation: true` with a 400 (all three candidates)
  - keep accepting it, which is what produces the documented silent no-op
  - **drop the field from the schema entirely** — raised by the owner 2026-11-20; `z.object` strips unknown keys, so this alone returns 200 and publishes nothing
  - **remove it from `ActionBodies.ts` and keep a 400 for the name** — the owner's decision
- **Decision (revised 2026-11-20):** remove the field **and** refuse the name. Removal alone is the
  trap: `model.ts:35` parses with `z.object`, which **strips** unknown keys, so deleting the field would
  make `publish_on_translation: true` answer 200, translate, not publish, and say nothing — the exact
  silent no-op R8 forbids. So both halves ship together:
  1. the field leaves `ActionBodies.ts:18`, which makes a TypeScript caller fail to compile — this is
     the removal, and it is why the owner narrowed R10;
  2. the server-side model keeps the **name** solely to answer 400, naming the field and the way out,
     Payload's own Publish button. A JavaScript caller or a raw HTTP client sees no types, so without
     this the removal would be silent for exactly the callers who cannot see it.
  An absent or `false` value is accepted unchanged, so the admin and any script that never set it are
  untouched. The 400 is a tombstone with a stated end: once this major has shipped, the name may leave
  the model too, and that gets its own ledger trigger. In the no-drafts world the same request is refused
  rather than ignored, which kills the documented silence.
- **Consequences:** the ledger entry `manual-translations-are-saved-as-drafts` (`DEPRECATIONS.md:927`)
  states "the route still accepts it … a host that scripts the route is unaffected". That promise is
  withdrawn — cheap now, because 1.0.0 is not published yet — and must be **struck through, not
  deleted**, with the correction beside it. A host scripting the route in TypeScript now fails to
  compile; one scripting it in JavaScript gets a 400.
- **Reversible:** yes — one schema line and one type field.
- **Guarded by:** the server-side model is the single parse site; a route test per refusal. Added in
  build step 6.

#### D9. The fix ships first and alone; the cuts ship as one breaking release

- **Context:** closing R3 restores a documented promise while the refusals break working installs. The
  ledger's rule: deprecations ship as `feat` (minor), removals land in the next major, grouped, committed
  as `feat(scope): …` with a `BREAKING CHANGE:` footer and **never** a `!` in the header, because the
  angular preset's header pattern has no place for one.
- **Options considered:**
  - the fix first and alone, then the refusals (normalize-first)
  - the fixes grouped together, then the cuts (read-optimized)
  - one release with no warn-first phase (append-only-log)
- **Decision:** the split. Mixing a restoration and a removal in one commit would leave a host unable to
  take the fix without the cut, and would make the release type ambiguous. No warn-first window: this
  *is* the next major, which is the house rule's own answer.
- **Consequences:** two user-visible moments instead of one. The refusal messages are the only migration
  notice a host gets, so each must name the collection, the unsupported thing and the way out.
- **Reversible:** no — a release cannot be unpublished. A later release can re-admit a world, which is
  the only way back.
- **Guarded by:** nothing mechanical for the footer convention — the ledger's "How a removal is
  committed" is the written rule and the release dry-run is the pre-merge check. Every shim gets a ledger
  entry with a trigger **query** (EV3), added in the step that creates it.

#### D10. Three state questions, three names, three authorities

- **Context:** adjudication found two different staleness questions heading for one word (framing gap 1).
  The owner's review added a third state nobody asks about: the change check fires on a *change*, so a
  target locale that was never translated at all — added after the last publish, or left behind by a
  failed run — is invisible to it. `localesHoldingContent.ts` already answers that question, and D6
  makes the layer it asks about an explicit argument.
- **Options considered:**
  - one word covering all of it, as today — rejected: this is the `skip_existing` defect the ask generalises from
  - two names, money gate and admin badge, leaving the never-translated state unasked (adjudication's framing gap)
  - **three names, each with its own authority and its own consumer** — the owner's decision
  - give the receipt a published/draft dimension so one mechanism answers all three — rejected under D5
- **Decision:** three distinct questions, named separately in code and in prose.
  1. **The publish-time change check** — "does the text being published differ from the previous
     published version" — answered from Payload's version history. Consumer: the auto-translate hook. It
     reads no receipt (D1).
  2. **The admin's per-locale staleness** — "does the latest saved source differ from the source the last
     run translated" — answered from `provenance`, recomputed through the latest-layer read. Consumer:
     the badge and the manual action beside it, which reads latest and writes a draft, so badge and button
     sit on the same layer. Its label must stop claiming "current": it does not speak about the published
     layer at all.
  3. **Emptiness on the published layer** — "does this locale hold anything in the published row" —
     answered by `localesHoldingContent` with the layer passed explicitly. Consumer: a row in the admin.
- **Consequences:** question 3 is **reported, never acted on**. The existence query cannot tell "never
  translated" from "the editor cleared this locale on purpose", and the owner's recorded decision is that
  a cleared locale reads as empty — so auto-filling would overwrite a deliberate clearing, silently and
  repeatedly. Reporting costs nothing on the publish path, because it runs when somebody looks. This
  closes the backfill open question without the receipt dimension the rejected candidates needed. What
  still has no answer: "is the published translation current", when auto-translate is off; with it on,
  the published layer is current by construction, because every publish catches it up.
- **Reversible:** yes — naming and one admin row; no stored shape changes.
- **Guarded by:** D5's receipts-off test keeps authority 1 out of the receipt; the three names are
  distinct symbols, so a reader cannot reach the wrong one by accident. Question 3's row is scoped in
  Open questions before it is built.

### Seam-trace findings — closed 2026-11-20

The trace report is `2026-11-19-fewer-worlds-louder-refusals.seam-trace.md`. Findings 1, 5 and 15 were
taken into D1, D3 and D7 above. The rest are closed here under the owner's standing rule — simplest to
build · follows the general behaviour instead of excepting it · no ambiguity and no guessing at the
editor's intent, sacrificing capability where those pull apart — and the condition that settled each is
named. **This closes the trace.** Further passes would keep producing candidates; what ends the method
is a decision, not exhaustion.

**Finding 2 — the intent union has no member for the no-drafts world. Closed: keep two members, state
the rule.** `publish: true` means "publish if there is a layer to publish into", and `publishIfAsked`
(`translateDocument.ts:45-48`) is the one place that holds it, guarded by `resolveTargetLayer`'s union,
where `publish` exists only on the `drafts` variant. *First condition:* a third member would duplicate a
distinction `TargetLayer` already makes, and two shapes stating one fact is the defect this design is
removing. D4's text carries the rule.

**Finding 3 — the legacy shim reads an auto row as a manual one. Closed: derive the intent from
`publishOnTranslation`, which is already on the row** (`task-runner/types.ts:40`). A row with
`publishOnTranslation: true` was queued by the auto path and normalises to `{ read: "published",
publish: true }`; `false` normalises to the manual pair. *First and third conditions together:* it is one
expression at the single parse site D4 already names, and it stops the shim guessing at a question the
row answers. Build step 4.

**Finding 4 — at-least-once redelivery overwrites a hand-edited target locale and pays twice. Closed:
the executor stops when the run record for its handle is already settled as succeeded.** The run record
is already "the authority for what was attempted" (Data flow & ownership), so this is one read and one
early return against a store that exists, with no new state. *Third condition:* a redelivery that
rewrites the editor's wording is the machine guessing it outranks a person. What this does **not** cover,
stated rather than implied: a process that died after writing and before settling, which redelivers and
overwrites as before — closing that needs to know what the run wrote, which is stored state this design
does not add. Build step 6.

**Finding 6 — the badge and the published-emptiness row contradict each other permanently. Closed: the
two are never shown as independent claims.** A locale whose receipt is current while the published layer
is empty is one state — the translation exists only as a draft — and the admin states it as one sentence
naming the layer, never as two answers side by side. *Third condition.* This rides with the emptiness row,
which the owner already assigned to the admin work; D10 carries it as a constraint on that work, not a
step here.

**Finding 7 — the three state reads share no snapshot, so they can disagree inside one render. Closed:
accepted.** A refresh resolves it; the exposure is one duplicate manual run if someone acts in the
window. *First and second conditions:* giving three authorities one snapshot is exactly the coupling D10
separated them to avoid, and the cure costs more than the transient it removes.

**Finding 8 — `admitWork` is a read-check-write with no constraint behind it. Closed: accepted and
recorded, with a trigger.** Two writers reaching one document within milliseconds — an editor and a
webhook — both read no live run and both enqueue, costing two provider calls for one publish. *First
condition:* closing it needs a unique index on the run collection, which is a SQL migration in
`apps/cms`, and "no stored shape changes" is a property this design holds deliberately (DM3, EV1).
**Trigger that forces revisiting:** a second worker, a queue outside Payload Jobs, or any host writing
managed documents from more than one process — each makes the window ordinary rather than rare.

**Trace open question 1 — which layer the enqueue route authorises against. Closed: the premise was
wrong.** The route does not reuse the list's published read; it asks Payload's own `update` evaluation
per document (`access/permission.ts:114-125`, via `refusedTargets.ts:22`). The disclosure path the
breaker described does not follow from it. The residue — which layer Payload evaluates that rule
against — is the same question build step 2 already pins, so it needs no step of its own.

### Build sequence

1. **The read entry.** Create `src/server/shared/payload/versionRead.ts`; move `sourceDocument.ts` and
   `localesHoldingContent.ts` onto it; add the lint zone pinning the `draft: true` literal there. No
   behaviour change. · covers: R6 · incremental
   · *verify:* the existing suite is green and the zone fails on a planted literal · *rollback:* revert.
2. **Pin Payload's access semantics for a draft read.** An integration test with a host `read` rule that
   denies non-published rows, asserting what `visibleIds` returns with and without the draft ask. No
   production change. · covers: R6 · incremental
   · *verify:* the test states the observed behaviour either way · *rollback:* none needed.
3. **The fix, alone, as `fix(translator): …`.** `previousPublishedOf` becomes the drafts-layer baseline;
   the list readers move onto the entry only if step 2's pin allows, otherwise they keep `"published"`
   through it; add the receipts-off hook test. · covers: R3, R4, R6 · incremental
   · *verify:* the four-step trace reads 1/1/1/1 and a no-change republish reads 0; the
   baseline-is-our-own-publish case is pinned; the revert-then-publish case is pinned too — a draft saved,
  reverted and published must read 0, which an unfiltered query would read as 1 and spend on ·
  *rollback:* revert — no stored shape changed, so the only
   unrecoverable cost is provider spend, which is why this ships alone.
4. **The intent travels.** `RunIntent` on the task input; auto admits published-and-publish, manual
   admits latest-and-no-publish; the executor reads it; a published run whose document is not published
   fails visibly; the intent-less legacy input normalises **from `publishOnTranslation`** at one parse
   site, with its ledger entry and trigger query. · covers: R5 · incremental
   · *verify:* an old-shape job input still runs; the auto path demonstrably reads the published row ·
   *rollback:* revert — both directions of the shim are tested, so in-flight jobs survive either way.
5. **The world and the refusals — `feat(translator): …` + `BREAKING CHANGE:`.** `src/core/domain/world/`,
   `SUPPORTED_WORLDS` and the meta-test, `worldOfCollection` as the single adapter and the lint zone
   enforcing it, `resolveTargetLayer` taking the world, the three refusal layers, `plugin.ts`'s bare
   errors onto `TranslatorConfigError`, zero surviving targets becoming a refusal, and the two
   integration boots the meta-test demands — `provenance: false`, and autosave with `withAutoTranslate`
   (R-1). The table is two rows and states in a line that `autosave` and `provenance` are not axes of it.
   `localizeStatus` is the refused row; `schedulePublish` is supported and gets its own integration test
   proving a scheduled publish reaches the hook and translates. The boot layer refuses the plugin's
   surface rather than the host's process (D3), with its refusal sentence beside the existing ones in
   `shared/http/readRefusals.ts`. · covers: R1, R2, R8 · big-bang for hosts
   · *verify:* the meta-test red before the proofs exist, green after; a boot test asserting a host whose
   world was changed late keeps serving its other collections while the managed one answers the refusal ·
   *rollback:* revert the release — no data has changed.
6. **The loud edges — `feat(translator): …` + `BREAKING CHANGE:`.** The executor stops when its run
   handle is already settled as succeeded (seam-trace finding 4); `AutoTranslateOutcome` as the hook's
   return type; `publish_on_translation` removed from `ActionBodies.ts:18` **and** 400 on the name at
   `model.ts:35` (D8, both halves or the removal is silent); 400 on a publish request in the no-drafts
   world; the `stale` criterion refused at admission instead of at `selectLeaves.ts:36`. · covers: R7, R8 ·
   incremental · *verify:* a route test per refusal, and a test that every hook path yields a named
   outcome · *rollback:* revert.
7. **Record it.** Ledger entries for D5's decision and its revisit trigger, the intent shim's trigger
   query, the trigger for dropping `publish_on_translation`'s 400 tombstone, and the struck correction to
   `manual-translations-are-saved-as-drafts` (`DEPRECATIONS.md:927-934`). `README.md:103/:239/:267/:273`
   and `:467` corrected, the three state questions of D10 given distinct names in code and prose, the
   badge relabelled, and one line recording that a manual run on an autosave collection may read
   half-typed text (R-1). · covers: R9 · incremental
   · *verify:* a ledger entry exists for every shim introduced in steps 4–6 · *rollback:* revert.

### Framing gaps found during adjudication

1. **Two staleness questions will exist under one word.** After D1 the money gate asks "has the published
   text moved since the last publish", while the admin's badge asks "has the latest source moved since
   the receipt" (`DocumentStaleness` reads through `sourceDocument.ts:7`, i.e. the draft). No decision
   point asked what the badge compares against, yet the two now differ. They must carry **different
   names** in code and prose, or the codebase repeats the `skip_existing` defect the owner is
   generalising from. **Resolved 2026-11-20 as D10**, which also names a third question neither the gate
   nor the badge asks. The badge's label is the one item still needing the owner's word (Open questions).
2. **`publishOnTranslation` becomes derivable** from the intent after D4 and D8, yet remains a required
   run-row column and a task-input field. Recommended: keep it as the record of what the run did, with a
   removal trigger in the ledger.
3. **Every run-record read is silently truncated at 500 rows** (`RunRecord.store.ts:43-47`), and
   `findLiveForDocuments` feeds `admitWork` — which is D7's correctness input. Out of scope here, but it
   bounds the guarantee D7 relies on.

### Open questions — closed 2026-11-20

The owner closed these under a standing rule: **pick the option that is simplest to build, that follows
the general translation behaviour rather than excepting it, and that leaves no ambiguity and no guess at
what the editor meant — sacrificing capability where those pull apart.** Each decision below names which
of the three settled it.

**`versions.drafts.localizeStatus` — refused.** With it on, `_status` is a localized field, so
`doc._status === "published"` stops meaning "this document was published" and starts meaning "this
locale was published". Every reader of that field changes meaning at once, including the publish gate
and D1's previous-published baseline, which becomes per-locale. *Settled by the third condition:* the
same expression would carry two meanings depending on a host switch, which is the ambiguity this whole
design exists to remove. The capability is sacrificed knowingly, and the refusal gives D2's table its
refused row, so R2's machinery has a world-shaped customer after all.

**`schedulePublish` — supported, with a named proof.** A scheduled publish is an ordinary
`payload.update` carrying `_status: 'published'` (`versions/schedule/job.js:31-35`), so the hook sees a
publish like any other and D1's baseline is the previous published version, unchanged. *Settled by the
second condition:* refusing it would be an exception to "auto-translate fires on publish" rather than an
instance of it — and it would break hosts of this repository's own scheduling plugin for no mechanism.
It needs no production code; it needs one integration test, in step 5, proving the scheduled publish
reaches the hook and translates. The scheduled job can also name a locale (`job.js:21-22`), which is the
`publishSpecificLocale` path the write side already handles.

**R5 — a version rule, not a version id. D4 stands.** *Settled by the first condition:* a rule is one
union member on the task input, while a pinned id needs a read path that bypasses access control and a
defined answer for an id that `maxPerDoc` has pruned — two mechanisms where the rule needs none. The
sacrifice is already recorded in D4: with a debounce, a run may translate a *newer* published row than
the one that triggered it. That is deliberate, and it is what lets a dropped save be covered by the run
it was dropped against (D7).

**The emptiness row — out of scope here, handed to the admin work.** *Settled by the first condition:*
the decision (D10) is cheap, but the row is new surface in `src/types/wire/*`, which R10 freezes and
which the admin work owns, and the admin is still on stubs. D10 records the question, its authority and
why it reports rather than acts, so the admin work inherits a decided item instead of an open one. No
step 8 here.

**The badge's label — decided, wording and all.** *Settled by the third condition:* the badge must state
the question it answers. "Current" claims the published layer is fine, which this check never looked at.
It reads **"translated from the latest saved version"** when the fingerprints match and **"source
changed since this translation"** when they differ. Step 7 carries it.

### Revisions after the owner's review (2026-11-20)

Each entry says what changed, what evidence moved it, and what it costs. Nothing here was decided from
memory; every claim names the file it was read from.

**R-1 · The autosave refusal is withdrawn (D2).** Two mechanisms could have justified it, and both were
measured absent:
- *Version pruning.* The worry was that autosave writes a version every few seconds, so `maxPerDoc`
  (default 100) would evict the previous published version — the baseline D1 compares against.
  `saveVersion.js:20-28` shows autosave **updates the latest version row in place** when that row is
  itself an autosave row, and `enforceMaxVersions` runs only when a new row was created
  (`saveVersion.js:79-80`). Autosave does not consume version history.
- *An extra decision path.* Autosave writes are draft writes, and the publish gate turns them away at
  `AutoTranslateEnqueue.hook.ts:71`, before any version is read. Autosave adds no case to the auto path.
Where autosave does bite is the **manual** path, which the proposed refusal did not touch: a manual run
reads the latest saved source, and with autosave there is no deliberate save, so it may read half-typed
text. Mild — the editor pressed the button, the result lands in a draft, it can be re-run — and recorded
in step 7's prose rather than built for.

**R-2 · "Payload cannot distinguish autosave from a manual draft save" was wrong.** The flag is absent
from the `afterChange` arguments (`operations/utilities/update.js:388-396`) — that much held — but `req`
is passed and carries `query` (`payload/dist/types/index.d.ts:48`), and the admin sends
`?autosave=true&draft=true` (`@payloadcms/ui/dist/elements/Autosave/index.js:88-96`), which the route
parses at `collections/endpoints/updateByID.js:8`. So `req.query.autosave` is readable from the hook.
**It is still not to be used**, for three reasons worth keeping on the record: it is absent for local-API
callers, who pass `autosave` as an argument rather than a query parameter, so the hook would be reading
the transport rather than the operation; it is not part of the hook's contract and may change without a
major; and it arrives as the string `"true"`. The design needs the distinction nowhere — which is the
real reason it does not take the dependency.

**R-3 · The ask's axis count drops from three switches to one.** Receipts left the decision at D1;
autosave left it at R-1. The supported-worlds table is two rows — published layer, or none — and must say
in a line that `autosave` and `provenance` are not axes, or the fork count grows back by habit.

**R-4 · `publish_on_translation` is removed, not only refused (D8).** The owner narrowed R10 for this
one field. Removal alone would have been silent, because `z.object` strips unknown keys; the pair of
removal plus a 400 on the name is what makes it loud for callers who have no types.

**R-5 · A third state question was named (D10).** The change check is blind to a locale that was never
translated at all. Reported, not acted on.

**R-7 · Two decisions reopened by the seam trace (2026-11-20).** D7 now builds an end-of-run re-check,
because the trace showed the dropped save is unrecoverable rather than merely invisible, and the cure
needs no stored state. D3's boot layer refuses the plugin's own surface instead of throwing, because an
`onInit` throw takes down collections the plugin does not manage — and on serverless it arrives after a
green deploy. D1's text now carries the published-status filter its decision always implied. The trace
report is `2026-11-19-fewer-worlds-louder-refusals.seam-trace.md`; its findings 2, 3, 4, 6, 7, 8 and its
first open question are not yet decided.

**R-6 · Every open question was closed on 2026-11-20** under the owner's standing rule — simplest to
build, follows the general behaviour instead of excepting it, no ambiguity and no guessing at the
editor's intent, capability sacrificed where those pull apart. The decisions and which condition settled
each are recorded under "Open questions — closed". Net effect on R-1's loose end: `localizeStatus` is
refused, so the refusal machinery has a world-shaped customer again.

### Accepted deviations

**The analyzer zone confining Payload's version vocabulary — dropped by the owner, 2026-11-23.** Build
steps 1 and 5 each called for a rule pinning `hasDraftsEnabled`, `hasAutosaveEnabled` and the version
read arguments to `worldOfCollection.ts`. It is not built and will not be. The guard it would add is
a guard against a mistake nobody has made since the entry exists, and the entry itself already makes
the illegal question a type error — which is the stronger half of the same protection. Not to be
raised again.

Otherwise none: every invariant is met, and the options that would have needed a deviation were
disqualified rather than excused.

### Rejected / grafted (for the record)

- **The receipt as the money authority** — rejected: combined with a single-row receipt key it produces a
  reachable silent no-op (R8) from one row carrying two meanings (DM1, DM6).
- **An omitted `provenance` option re-read as "on"** — disqualified: R8, EV5. A silent behaviour change
  for every host that omits it.
- **An append-only receipt log** — disqualified: DM4 (history nothing reads) and DM3 (a down migration
  that must deduplicate is not a rollback). Its own author recommended against it.
- **A `sourceVersion` column on the run row** — rejected on the merits: no reader, a SQL migration in
  `apps/cms`, and a one-way door the design does not need (DM3, EV1).
- **Level-triggered self-healing for the dropped save** — rejected: it exists only under the receipt
  authority, and grafting it onto optional receipts leaves the drop with no derived state to be visible
  in.
- **Grafted from append-only-log:** the supported-worlds table with `provedBy` and its meta-test (D2) ·
  the intent on the task input instead of a column (D4) · `worldOfCollection` as the single caller of the
  version helpers (D3) · the `stale` criterion refused at admission (R7) · the adversarial host read rule
  as D6's pin.
- **Grafted from read-optimized:** one refusal class (D3) · the content-hash argument, which is the
  correct *reason* the receipt key needs no dimension once the receipt is not the authority (D5).
- **Kept from normalize-first (the spine):** D1's published baseline · the first refusal layer and its
  ordering · `versionRead.ts` and the gated list move · the named outcome at D7 · the fix-first release
  split at D9.
