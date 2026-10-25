# A run carries fields, not a strategy

**Status:** awaiting approval · **Risk:** high · **Issue:** #208, the server half of #48
**Design:** `2026-10-18-the-rewiring.md` §4 (S1–S6); D21 superseded, see D2 below.

## Requirements / Task restatement

A translation run carries a *strategy* — `overwrite`, or `skip_existing` (fill what is empty, refresh
what drifted). The strategy exists because nobody ever asked the editor which fields they meant, so a
rule had to guess, and two of its clauses guess about state the caller never stated: "is the target
empty" and "did the source move". One of them, `skip_existing`, means something different again when
provenance is off.

Replace the guess with an explicit answer: **a run carries the list of leaves to translate.**
`TranslationStrategy` disappears as a port, with both implementations, from the pipeline, the enqueue
input, the stored row, the host-facing task, the status response and both admin forms.

Server only. The field-picker tree is built elsewhere; nothing here touches `src/client/` except what
dies with the strategy.

## What already exists — platform · installed · project · verdict

Nothing is invented; every piece reuses something the package already has.

| Need | What already does it |
|---|---|
| enumerate every translatable leaf of a document | `projectTranslatableContent(doc, schema)` — `core/domain/content-projection/contentProjector.ts:42`, already pinned against the pipeline's collector by `driftGuard.test.ts` |
| answer "which leaves drifted" | `changedLeaves(recorded, currentFields)` + `recordsEachLeaf` — `core/domain/provenance/staleness.ts:55` |
| the one address grammar | `makeIdPath` / `elementSegment` — `core/domain/content-projection/idPath.ts:78,91` |
| refuse bad input at the request | `EnqueueInputSchema` + `ServerResponse.validationError` — the enqueue route already rejects four ways |
| one declaration for the stored row | `jobInput.schema.ts` — generates both the TS types and the registered Payload fields |
| normalise a target list | `Locales.resolveTargets` / `Locales.dedupe` |

Nothing new is built outside the two units named under **New surface**.

## Decisions

**D1 — the pipeline takes a list of leaf addresses; the strategy port is deleted.**
`FieldChunkCollector`'s per-leaf rule collapses to: translatable · in the list · source non-empty.
`targetValue` leaves the decision entirely — nothing consults the target locale to decide what to
translate. `targetData` stays, because `DataReconciler` still needs it to assemble the document.
*Rejected — keep the port with one implementation that reads the list.* An interface with one
implementation and no second caller is a field, and the port's whole purpose was to hold the branch
this removes.

**D2 — the row carries named criteria, not a run kind. Supersedes D21.**
D21 stores `ordinary | out-of-date only`. That names one source of the list inside a type, so a second
source ("leaves empty in the target", "leaves matching a filter") cannot be added without changing the
type and every reader of it. A list of names can.
*Rejected — D21 as written.* Recorded here rather than argued again later.

**D3 — a criterion is a source of a list, not a filter over one.** It answers "here are the addresses
I vouch for"; the run intersects. *Rejected — hand the criterion the current list to filter.* Then
order matters and every criterion must be told about everything before it. As intersection, order
cannot matter — a property of the shape rather than a rule anyone has to honour. It also makes a
person's ticks and a criterion the same kind of thing: both are lists.

**D4 — "everything" is materialised into a real list before any intersection.**
With no selection on the row, the handler calls `projectTranslatableContent(sourceData, schema)`. So
inside the run the list is always concrete.
*Rejected — treat "absent" as a special value meaning everything.* Then the intersector has two input
shapes and every criterion must handle both.

**D5 — the criteria are applied by the handler, not by a module on the seam.** Provenance keeps one
job, the one it has always had: it *reports*. Before #198 it produced a drift map and
`SkipExistingStrategy` decided; it has never narrowed anything, and this step does not give it that
job.
*Rejected — a narrowing module on the chain.* A module's failure is swallowed by design
(`swallowOrThrow`), and for a narrowing step swallowing turns "only what drifted" into "the whole
document, over reviewed text", silently. A criterion that cannot answer fails the translation instead.
*Rejected — a registry of criterion modules keyed by name.* One criterion exists; that is structure
for a second caller nobody has.

**D6 — the chain stays assembled at boot.** The plan this task adopted said per-locale chain assembly
was the largest piece of the work. **It is not owed.** That followed from criteria being modules; with
D5 they are not. The chain is host modules plus provenance's recorder, the same for every run, and what
varies per locale is a field the handler reads. One clause of the inherited design, dropped on the
"is it due here" walk.

**D7 — an old row's `skip_existing` is read as the `stale` criterion.** Rows written before this
change are in flight when it deploys and carry a strategy the code no longer has. Translating the
intent preserves what the person asked for.
*Rejected — ignore the old field and translate everything.* Cheaper, and it spends the host's money
re-translating over reviewed text for every row already queued.
*Removal condition, not a version:* `DEPRECATIONS.md` says to drop the read once no row written before
1.0 can still be in flight — a shim whose life is the queue's drain time, not a public type's.

**D8 — "translated nothing" is logged, not reported.** Three causes are now distinguishable: nothing
drifted, the selection's addresses no longer exist, nothing the person ticked drifted. The log names
which. *Rejected — carry it to the host and the admin.* That crosses the runner port and the lifecycle
event type, which step 6 (#200) reshapes; doing it now means doing it twice.

### Placement

| Piece | Lands in | Why there |
|---|---|---|
| the intersector | `core/domain/selection/` (new) | pure, no Payload, beside the other domain rules it composes with |
| the `stale` answer | `server/modules/provenance/Provenance.service.ts` | the comparison reads provenance's own store; the service is already "the single owner of fingerprint policy" |
| applying criteria | `server/features/translate-document/handler.ts` | the run is where "what do we translate" is decided |
| the row's shape | `payload-jobs-runner/store/jobInput.schema.ts` | the one declaration both the types and the Payload fields come from |
| validation of a selection | `server/features/enqueue-translation/model.ts` | refusals belong at the request, not in the worker |

### New surface — the shape check

Triggers fired: a field is added to a published type (`TaskInput`, `TranslationTask`, the enqueue
input); the new fields are optional; an exported function gains a parameter (`translateContent`).

**The row's per-locale shape**, the one that matters:

| | `targets: [{ lng, selection?, criteria? }]` (chosen) | `target_lngs: string[]` + parallel maps keyed by locale |
|---|---|---|
| cost of the next field of this kind | 1 place — the entry type | 2 — a new map and its reader |
| states admitted / produced | **n / n** — one entry per locale by construction | admits a map key with no locale, and a locale with no entry; neither is ever produced |
| second caller already in the repo | `localesAsTheyStand` and `extendJob` both walk the list | same |
| breaks for an implementor outside this repo | the stored shape a third-party runner replays | identical |

One shape survives on the honesty row. Two new units, each with two callers named:

- **the intersector** — callers: the handler (every run), and its own suite. Second *behavioural*
  caller is the `stale` path, which composes with a selection.
- **the `stale` answer on the provenance service** — callers: the handler, and the staleness route,
  which needs the same per-leaf answer to report drifted addresses.

### Written contract

Two units owe callers what a signature cannot state, so Phase 3 runs these through `/sp-red-test`:

- **the intersector**: the result is a subset of every input; order of inputs does not change it; an
  empty input list means an empty result, not "no restriction"; an address no input vouches for is
  absent rather than an error.
- **a criterion's answer**: the complete set of addresses it vouches for, independent of what the run
  already holds — never a filtered copy of the input.

### Escalate to `/sp-architect`?

No. The design arrived from `2026-10-18-the-rewiring.md` §4 and this task builds one of its steps.

## Acceptance Criteria

Run from `packages/payload-plugin-translator` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A run with a selection translates those leaves and leaves every sibling's target text untouched | `bunx vitest run src/core/translation-pipeline` | the new case runs green |
| AC2 | A run with no selection translates every translatable leaf | same file | green — today's default, unchanged |
| AC3 | The intersector keeps its contract: subset, order-free, empty means empty | `bunx vitest run src/core/domain/selection` | green, written red-first against a stub |
| AC4 | A selection together with more than one `collection_id` is refused | `bunx vitest run src/server/features/enqueue-translation` | 400, the message names the restriction |
| AC5 | A selection carrying a positional address (`content.#0.heading`) is refused | same file | 400, the message names the address |
| AC6 | An unknown criterion name is refused at the request | same file | 400, the message lists the known names |
| AC7 | A run naming `stale` translates the drifted leaves and nothing else | `bunx vitest run src/server/features/translate-document` | green |
| AC8 | A selection **and** `stale` translates only the ticked leaves that drifted | same file | green |
| AC9 | A criterion that cannot answer fails the translation rather than translating everything | same file | the run rejects; no provider call |
| AC10 | A run that translates some leaves leaves the receipt's claims for the others unchanged | `bunx vitest run src/server/modules/provenance` | green; the untranslated leaf still reads stale afterwards |
| AC11 | The staleness route reports the drifted addresses, and none for a whole-document receipt | same command | green |
| AC12 | An old row (`target_lngs` + `strategy: "skip_existing"`) reads back as one target naming `stale` | `bunx vitest run src/server/modules/task-runner` | green |
| AC13 | Two requests over one document differing only in their lists share a single run | `bun run test:integration` from `apps/dev` | green; one job row |
| AC14 | Auto-translate still enqueues on a source change, and its run covers the whole document | same command | green |
| AC15 | Nothing else moves | `bunx vitest run` · `bun run check-types` · `bunx oxlint .` · `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root · `bun run test:integration` from `apps/dev` | ≥183 files / ≥2445 checks, 0 type errors, ≤44 warnings and 0 errors, build green, 63 integration files green |
| AC16 | No `strategy` left in the package outside the deprecation record | `grep -rln "strateg" src --include="*.ts" --include="*.tsx" \| grep -v "__tests__" \| grep -v "\.test\." \| grep -vi "field-actions"` | empty |

## Pre-flight — each check run against the untouched tree

| AC | Result on the base | Classification |
|---|---|---|
| AC1, AC2, AC7–AC9 | the cases cannot be written in their final form: `translateContent` has no `selection` parameter and the handler has no criteria, so a test naming either is a type error | **change** — fails for the right reason |
| AC3 | `src/core/domain/selection` does not exist; vitest exits non-zero with no matching files | **change** |
| AC4–AC6 | `EnqueueInputSchema` has no `selection` and no `criteria`; a request carrying either passes validation today, since zod strips unknown keys | **change** |
| AC10 | the current recorder re-bases an unsent leaf onto the current hash (`Provenance.service.ts:37-44`), so the assertion fails today | **change** |
| AC11 | the staleness route returns `{target_lng, source_lng, is_stale, translated_at}` and no addresses | **change** |
| AC12 | there is no `targets` shape to read into | **change** |
| AC13 | `pickHost` compares `strategy`, so two requests naming different strategies cannot share a run | **change** |
| AC14 | passing | **invariant** |
| AC15 | 183 files / 2445 checks, 0 type errors, 44 warnings, build green, 63 integration files | **invariant** |
| AC16 | **33** non-test files under `src` carry the word | **change** |

## Risk notes

**High.** Three reasons, each changing what later phases do:

1. **Published types change** — `TaskInput`, `TaskHandlerInput`, `TranslationTask`, the enqueue input
   and the status response. A third-party runner implements the port.
2. **The stored row's shape changes.** No SQL migration is needed (everything lives in Payload's
   single `input jsonb` column), but rows written by the previous version are in flight at deploy and
   must still read — D7.
3. **A silent widening is the failure mode.** Every defect in this area makes the run translate *more*
   than it was asked to, over text a person reviewed, at the provider's price. Quiet is the dangerous
   direction, which is why D5 refuses a swallowed failure and AC9 pins it.

Two things to watch while building:

- the address a selection names must be minted by the same grammar as the collector's and the
  fingerprint's. `driftGuard.test.ts` pins two of the three producers; a selection is the third.
- `extendJob` appends to `target_lngs` with a `db.updateOne`; appending whole entries instead of
  strings must keep its two-attempt retry and its "the row completed mid-append" fallback.

## Human choices

Settled by the owner in conversation, 2026-10-23:

- **Strategies go completely**, including `AutoTranslateConfig.strategy` and the exported
  `AutoTranslateStrategy`. Auto-translate is not reworked here; its runs cover the whole document.
  "б - убираем тогда стратегии полностью."
- **The criterion is a source of a list, and the narrower only intersects.** "Сократитель … сам по
  себе должен принимать только список полей которые мы переводим."
- **The field is named `criteria`.**
- **An old row's intent is translated** rather than dropped, marked as a shim with a drain-time
  removal condition.
- **"Translated nothing" is logged only** in this step; surfacing it belongs to step 6.
- **The stored shape is exercised in `apps/dev`,** not `apps/cms` — `apps/cms` wires the simple runner
  and never writes a job row. §9 of the rewiring plan is corrected to say so.

At the Phase 2 gate:

- **D6 confirmed — the chain stays assembled at boot.** Per-locale assembly was carried into this
  task from the plan as "the largest piece"; it followed from criteria being modules, which D5
  refuses. No tenant today needs to be in one locale's chain and out of another's.
- **The staleness route reports drifted addresses in this step** rather than being left to the
  session building the tree, so the two do not edit the same file.

## Open, not solved here

- **The auto-translate rework** — external control over whether a save triggers a run and over what a
  run covers. Its own task. Notes from reading the module: the trigger criterion must stay synchronous
  because it runs inside the editor's save transaction, and `AutoTranslatePolicyResolver(slug, doc)`
  already exists as the declared swap point.
- **Surfacing "translated nothing" to the host and the admin** — step 6 (#200), where the runner port
  and the lifecycle event are reshaped anyway.
- The field-picker tree and everything else in `src/client/`.
- A criterion that **adds** leaves. The shape admits narrowing only.
- A parameter channel for criteria. Arrives with the first criterion that has parameters.
- A leaf whose target was cleared by hand is written with the untranslated **source** text
  (`DataReconciler.ts:84`). Pre-existing.
- Rich text cannot be selected below the field: the collector emits one leaf per `richText` field.

## Regression sweep

Mandatory at this risk level, so what was searched and what came of it:

| Surface | Searched | Call sites read | Found |
|---|---|---|---|
| the runner port (`TaskRunnerProvider`, `TaskHandlerInput`) | `grep -rln "TaskRunnerProvider\|TaskHandlerInput"` over `packages` and `apps` | 21 files, all in this repository | none — every one compiles |
| the host-facing lifecycle task | `grep -rn "\.strategy"` over `packages` and `apps` | 2 | **one defect**: `apps/dev/src/lib/translator/lifecycleLogging.ts` read `task.strategy`. It compiled because `apps/dev`'s `check-types` covers only `src/integration/`; nothing else in that app is type-checked |
| the enqueue route | `grep -rln "/enqueue"` | 10 | none |
| Payload's generated types | `grep` over both apps' `payload-types.ts` | 2 files | **one defect**: `apps/dev/src/payload-types.ts` still declared `strategy` and `target_lngs`. Regenerated; `apps/cms` never carried them, because it wires the simple runner and registers no job types |
| unchecked host code in `apps/cms` | `grep -rn "\.strategy\|target_lngs\|skip_existing"` over `src` | — | none |

*The first finding is the one worth keeping in mind:* a type-check that covers part of an app will
pass over a host consumer reading a field that no longer exists.

## Acceptance criteria — walked with their declared checks

| AC | Result | Evidence |
|---|---|---|
| AC1 selection translates those leaves, siblings untouched | met | `bunx vitest run src/core/translation-pipeline` — 199 checks green, including "keeps the target text of a leaf the selection left out" |
| AC2 no selection translates every translatable leaf | met | same command, "sends every translatable leaf when the request named none" |
| AC3 the intersection keeps its contract | met | `bunx vitest run src/core/domain/selection` — 9 checks, written red-first against a stub; every one proven to redden under a mutation of its own clause |
| AC4 a selection with more than one document is refused | met | `bunx vitest run src/server/features/enqueue-translation` — 31 checks |
| AC5 a positional address is refused | met | same command, and `namesAPosition` has its own 6 checks |
| AC6 an unknown criterion name is refused | met | same command; the message lists the known names |
| AC7 a run naming `stale` sends the drifted leaves only | met | `bunx vitest run src/server/features/translate-document` — 90 checks |
| AC8 a selection and `stale` together | met | same file, "sends only what both the request and the criterion name" |
| AC9 a criterion that cannot answer fails the run | met | same file, two cases: the criterion throws, and nothing answers the name. No provider call in either |
| AC10 the receipt keeps the claims for leaves a run did not send | met | `bunx vitest run src/server/modules/provenance` — 96 checks with `src/server/features/staleness` |
| AC11 the staleness route reports the drifted addresses | met | same command, and reports none for a whole-document digest |
| AC12 an old row reads back | met | `bunx vitest run src/server/modules/task-runner` — 298 checks, including a check tying the shim's criterion literal to provenance's own constant |
| AC13 two requests over one document share a run | met | `bun run test:integration` — `field-selection.int.test.ts`, both the append path (another locale) and the covered path (the same locale) |
| AC14 auto-translate enqueues, and covers the whole document | met | `auto-translate.int.test.ts`, 4 checks |
| AC15 nothing else moves | met | 186 files / 2461 checks · 0 type errors · 43 lint warnings, 0 errors (one fewer than the 44 baseline) · build green · integration 56 files, 224 passed / 8 skipped |
| AC16 no `strategy` outside the deprecation record | met, with the nuance below | three files carry the word, all of them the read-only shim D7 approved: `jobInput.schema.ts` (`LegacyRunSchema`), `runTargets.ts` (`legacyRunTargets`) and the destructure in `localesAsTheyStand.ts`. The criterion said "no hit outside a comment naming the removal"; these are code, not comment, and they are the shim itself |

## Review log

### Comment audit over the whole diff — 2026-10-23

67 blocks collected, 65 judged (two were Markdown and out of scope), verdicts reconciled. Density was
fine for inline comments (0.15 per ten lines of added code) and heavy for docblocks: one fact — "a
selection and criteria are per locale; omitting a selection means every leaf" — was written out in
seven places.

Four of the findings were **false statements**, not verbosity, and each is a defect this run
introduced:

| Found | What was wrong | Done |
|---|---|---|
| `field-selection.int.test.ts` | its docblock claimed the queue runner carried the selection through a stored row. `bootTestPayload()` with no runner uses the **simple** runner, which writes no row — so the file's whole subject was untested | switched to `createPayloadJobsRunner({ autoRun: false })` and driven with `jobs.run` |
| `idPath.ts` | inserting `namesAPosition` left `makeIdPath`'s docblock stranded above it | moved back |
| `runTargets.ts` | "the module that answers to it is optional, so the name is spelled rather than imported" — importing a string constant needs nothing at run time. The real constraint is that `store/` must not depend on `provenance/` | reason corrected |
| `Provenance.criterion.ts` | "the plugin passes the name around without reading it" — the store spells the same literal | corrected, and a test now ties the two spellings together rather than prose |

The rest: 18 deleted, 22 rewritten, 17 answered by changing code — the largest of those replacing six
copies of one docblock with a shared `RunAsk`, and six hand-written copies of an enumeration with
`everyTranslatableLeaf`.

### Three fresh-eyes passes — 2026-10-23

Run in parallel over the finished diff: one on the new mechanism, one on stored data and consumers
written before the change, one on what the deletion took with it. Between them they found one defect
I had introduced **while fixing another one**, and three more.

**The merge rule was wrong, and I removed it.** A previous pass had added `widenedBy`, merging a
second request into a locale a live run already listed, so the second ask would not be dropped. The
merge took the union of the selections and the intersection of the criteria — **independently**, and
that is not the union of two asks. A run listing `{criteria: ["stale"]}` merged with a request naming
`{selection: ["x"]}` produced an entry naming neither, which translates **the whole document**: past
both asks, over reviewed text. The shape cannot express the union of two `(list, rules)` pairs at all.

Replaced with the simpler thing: `alreadyCovered` now asks whether the listed ask **covers** the new
one — starts from at least as much, narrows by at most as much — and a locale it does not cover goes
to its own run. That deletes `widenedBy`, and with it three further findings that only existed
because of it: a widening lost to a concurrent writer, a widening applied after the worker had
already read the row, and a locale reported covered by a narrower run under `enableConcurrencyControl`.

*What it costs:* a request asking for fields the live run was not asked for now gets its own run over
that document, which can race the first. That hazard is older than this change — S5 measured it — and
the README now says to switch `enableConcurrencyControl` on.

| Other finding | Done |
|---|---|
| a host still posting `strategy` to `/enqueue` got a 200 and a run over the whole document | refused with a 400 naming the replacement |
| a host config still carrying `AutoTranslateConfig.strategy` was ignored in silence | warns at boot, per collection, with a test |
| `sourceChangedByLeaf` was computed on every run and read by nobody — the receipt was read twice | the field and its plumbing deleted; the criterion uses the shared `driftedAddresses` |
| `DEPRECATIONS.md` claimed a queued `skip_existing` row "keeps meaning what it meant" | corrected to a table of the three cases, including that with provenance **off** such a row now fails rather than overwriting — deliberate, and stated |
| `README.md` still described `skip_existing` | rewritten around the `stale` criterion |
| the converted blocks test could no longer catch a pairing bug, and no integration case ran a selection over blocks | one added: a selection naming one block's leaf by id, with its sibling's target text left standing |

**One hygiene finding stands, with its proof.** `sp-diff-checks` reports an assertion removed from
`chainOrder.test.ts` with none added back. It guarded the chain's fallback for `sourceChangedByLeaf`;
that field now has zero references anywhere under `src`, so the behaviour it guarded no longer
exists.

**Not fixed, recorded instead:** three cases deleted with the two strategy integration suites have no
integration replacement — publishing when nothing drifted, and writing nothing when a versioned
collection is already translated. The publish-after-nothing path is covered by a unit test
(`handler.test.ts`). A coverage gap, not a defect.

## Superseded in part

The two members this contract gave a target locale — `selection` and `criteria` — were merged into
one list of filters before any of it was committed. See
`2026-10-23-one-list-of-filters.task.md`; every decision above stands, only the shape moved.

**AC4, AC5 and AC6 were reversed on 2026-10-25, before any of this was committed.** The enqueue
route no longer refuses a selection sent with several documents, an address that names an element by
position, or a rule name nothing answers to. `namesAPosition` was the predicate AC5 ran on and had no other caller, so it went too, with its six checks. All three were request-time checks on a property of a
string, and the grammar that mints those strings disagreed with two of them: `elementSegment`
produces a positional address deliberately, with its own checks. Whether anything answers to a rule
name is now settled only where the run is narrowed (`translate-document/handler.ts`, `answerTo`),
against the criteria as they stand when it runs rather than when it was queued — the throw was
always there, and the route merely asked the same question earlier. `knownCriteria` went with it,
out of `ConfigTimeContext`, `PluginConfigBuilder`, `createTranslationRoutes` and `EnqueueConfig`.

What the removal gives up, recorded rather than implied: a selection holding a positional address
is resolved against the document as it then stands, so a run whose elements were reordered in the
meantime translates a different element and reports success. Reachable only through an array or
blocks row with no `id`, which Payload assigns by default. The cure, if it is ever owed, belongs to
whatever mints the address or to the field picker — not to the request handler.
