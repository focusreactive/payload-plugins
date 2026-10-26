Build step: 2026-10-25-asking-payload-everywhere.design.md #7

## Task restatement

Steps 3–6 added asks. Every one of them is a call a later edit can delete, and nothing would notice.
This step makes deleting one **not compile**: `TaskRunner.enqueue`, `cancel` and `run` stop accepting
a plain task or handle and accept only a value that passing the ask produces.

Covers **R2**. Out of scope: the three-valued identity (#8), the module seam (#9), pins and `@since`
(#10).

## Measured, not assumed

| Claim | Measured |
|---|---|
| the blast radius is a sweep | **no** — 7 files call `.enqueue(`, of which **2 are production**; `.cancel(` and `run` add 3 more production sites. Five production mint sites in total |
| host runner implementations break | **no, proven by probe**: TypeScript method parameters are bivariant, so an implementation declaring the *wider* `TaskInput[]` still satisfies an interface demanding the branded narrower type. A scratch file reproducing the exact shape type-checked clean |
| a string brand is forgeable | **yes, and the project already learned it** — `ApprovedWrite`'s docblock records that a symbol key is used precisely because "unlike a string brand no literal can name it" |
| the hook must not ask | settled in the design's D5: a host callback that throws inside the editor's `afterChange` destroys the save |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| project | `ApprovedWrite` (`targetDocument.ts`) — type-only `declare const … unique symbol`, one cast at a module-private mint | **the idiom to copy.** It brands *data that travels*, which is what a task and a handle do |
| project | `ApprovedSource` — a **runtime** `unique symbol` minted by a literal, no cast | the stronger form, but it binds a value that never leaves the module. A task is reshaped on its way into storage, so a runtime key could be dropped while the type still claimed it |
| project | `targetDocument.contract.test.ts` | the pin to copy: it proves neither brand is assignable from a plain object, nor from one guessing the brand |
| project | `refusedTargets` (step 5) | **the ask**. This step does not add a second one; it makes the ask the only place a branded value appears |

Nothing new is installed.

## Decisions

### D1 — the **ask** mints, not the handler

**Chosen:** the branded values come out of functions in `shared/access/` that do the asking.
A handler cannot produce one except by calling them.

**Rejected — handlers mint after asking** (the design's own wording). A shared minter exported for
three feature modules to call *is* a forge: anything may call it, so the brand would prove only that
someone typed its name. The guarantee this step exists for would be a speed bump.

**Constraint cited:** `approveWrite`, the only minter of `ApprovedWrite`, is **module-private** — the
type is exported, the minter is not. Three feature modules cannot share a private minter, so the mint
must move to where the ask already lives.

### D2 — a type-only brand for both, one cast each

**Chosen:** `declare const … unique symbol` for `AuthorisedWork` and `AuthorisedHandle`, with exactly
one cast per brand, both inside `authorised.ts`.

**Rejected — a runtime symbol, as `ApprovedSource` uses.** A task is copied and reshaped on its way
into the stored row (`planEnqueue`, `toPayloadFields`). A transform that rebuilds the object would
drop a runtime key while the **type** still claimed the brand — a silent divergence. A handle is a
`string` and cannot carry a property at all, so the runtime form is not even available there.

**Rejected — a string brand** (`{ __brand: "Authorised" }`). Proven forgeable in this repo already;
`ApprovedWrite`'s docblock records why it was replaced.

### D3 — two brands, not one

`AuthorisedWork` has **2** mint sites (the enqueue route, the auto-translate hook);
`AuthorisedHandle` has **3** (cancel, cancel-by-collection, run). Both clear the ≥2-callers rule on
their own, so neither is a type with one caller.

**Rejected — one brand for all three methods.** `enqueue` takes tasks and `cancel`/`run` take
handles; one brand over both would let a handle be passed where work is expected.

### D4 — the hook's non-ask becomes a named value

`authorisedByTheSave()` mints `AuthorisedWork` **without** asking, and its docblock carries the
reason (D5: asking inside `afterChange` risks destroying the editor's save). Adopted from the design
unchanged, and this is what makes the non-ask **visible code** rather than the absence of a call.

### D5 — the field route gains no brand

It writes nothing through the runner, so there is no sink to guard, and a brand there would have one
mint site. Settled in the design (**ST1**); recorded here so Phase 5 does not read its absence as an
oversight.

### D6 — shape check

Triggers that fired: a parameter type narrows on **three methods of a port implemented outside this
package**.

| | branded parameter types *(chosen)* | a second `authorisedEnqueue` method beside the existing one |
|---|---|---|
| cost of the next guarded sink | one brand, already written | another method, another deprecation |
| states admitted vs produced | only values the ask produced — gap **0** | both guarded and unguarded paths stay reachable forever |
| second caller already in the repo | 2 and 3 mint sites respectively | same |
| breaks outside this repo | **implementers: none** (bivariance, proven); callers of the runner: yes, and they must ask | nothing, and nothing is guaranteed either |

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R2 | `runner.enqueue` does not accept a plain `TaskInput[]` | a `@ts-expect-error` pin; `bun run check-types` is the check |
| AC2 | R2 | `runner.cancel` does not accept a plain `string[]`, and `run` no plain `string` | two more pins in the same file |
| AC3 | R2 | Neither brand is assignable from an object guessing it | a type test in `__tests__`, mirroring `targetDocument.contract.test.ts` |
| AC4 | R2 | The only way to get `AuthorisedWork` from a request is through the ask | `grep`: every production `enqueue`/`cancel`/`run` call site takes its argument from `authorised.ts` |
| AC5 | R2 | The hook's non-ask is a named value, not a missing call | the hook calls `authorisedByTheSave`, and its docblock says why |
| AC6 | R2 | A refused document still does not reach the queue | the step 5 and 6 access suites stay green, unchanged |
| AC7 | R6 | A host runner implementing the wider parameter still compiles | a pin declaring such an implementation |
| AC8 | R5 | The baseline holds | real `turbo build` green; integration **225 passed / 8 skipped** |

## Pre-flight — against the CURRENT tree

| # | Polarity | Now | Evidence |
|---|---|---|---|
| AC1–AC3, AC5 | must FAIL | **fail** | `grep AuthorisedWork src` → nothing; the methods take plain types |
| AC4 | must FAIL | **fails** | all five production sites pass unbranded values |
| AC6, AC8 | must PASS | **pass** | 201 files / 2552 checks, build green, 225/8 |
| AC7 | must PASS | **passes** | proven by probe before any change |

## Risk notes

**High risk, and higher than steps 5–6.**

- **Callers break, implementers do not.** Proven by probe, and the distinction is the whole
  migration story. A host calling `runner.enqueue(tasks)` directly must now obtain the tasks from the
  ask. That owes a release note at step 10.
- **The brand is a compile-time guarantee only.** It proves a call passed through the ask; it cannot
  prove the ask answered honestly. The runtime guarantee stays where it was — in `refusedTargets` and
  the worker's own check.
- **One cast per brand is the point, and more than one would undo it.** Phase 5 counts them.
- A test is required before done; the regression sweep names what was grepped and how many call sites
  were read; Phase 5b runs several angles.

## Human choices

**2026-10-25.** The owner directed an uninterrupted run through steps 5–10, stopping only at a
genuine fork, and named the breaking-change question as the likely one. **It did not become a fork:**
a probe showed host implementations are unaffected, so there is no "break everyone now versus a
deprecation window" choice to put. D1 departs from the design's wording — the design said the
handlers mint — because a minter shared by three feature modules must be exported, and an exported
minter is a forge. Recorded rather than asked, since it strengthens the design's own stated intent.

## Criteria results

| # | Outcome | Evidence, by the check the criterion named |
|---|---|---|
| AC1–AC2 | met | 4 `@ts-expect-error` pins in `theQueueDemandsAnAsk.pins.ts`; **mutation**: widening `enqueue` back to `TaskInput[]` turns one into "Unused '@ts-expect-error' directive" and `check-types` fails |
| AC3 | met | 6 checks in `authorised.contract.test.ts`; **mutation**: replacing the symbol brand with a string brand reddens the forgery check |
| AC4 | met | all five production sinks read `authorised`, `thisJob` or `authorisedByTheSave(tasks)` |
| AC5 | met | `AutoTranslateEnqueue.hook.ts:80` calls `authorisedByTheSave`, whose docblock carries the reason |
| AC6 | met | the step 5 and 6 access suites are unchanged and green; **mutation**: dropping the ask in `authorisedWork` reddens 3, in `authorisedHandles` 6 — across all three job routes |
| AC7 | met | `aRunnerFromBefore` in the pins file declares the wider parameter types and compiles |
| AC8 | met | real `turbo build` green, forced; integration **225 passed / 8 skipped** |

## Review log

**2026-10-25 — the measurement that decided the step.** Narrowing the three methods produced **29
type errors across 7 files**: five production sinks and two test files. The compiler enumerated every
place that reached the queue, which is the payoff — a later edit that deletes an ask now fails to
compile rather than passing silently.

**`/sp-complexity`.** Neighbourhood 9 files; history mute for the new ones (born this commit), so no
edit. "A fifth named path to the queue": CHANGE 2, READ 3, STATE 4 → 5 — and the states *are* the
domain, one per answer to "what authorised this". "Another queue method narrows": CHANGE 1 in the
interface, and the **compiler** produces the site list, so READ does not grow with it. **No findings.**

**`/sp-abstraction`.** Audited by the author.

- **Finding, fixed:** the `AuthorisedWork` docblock claimed "every value comes from a function in this
  module". **False** — `TaskRunner.invariants.ts` mints two with casts. Corrected to say what the
  brand actually guarantees: a guard against *forgetting*, not against intent.
- **A suspicion of mine that measurement refuted:** `authorisedWork` returns bare document ids while
  holding composite keys internally, so I expected an ambiguity when two collections share an id.
  There is none — `collection_slug` is a single field, so one enqueue request covers one collection.
- **Observation:** the brand types are not re-exported from `src/index.ts`, so a host cannot name
  them. Not a break (bivariance lets them declare the wider type), but it owes a release-note line.

**`/sp-red-test` in audit mode.** No stub was written: the module also exports the types the whole
tree compiles against, so it cannot be stubbed out — a limit of the technique, not a finding. Three
mutations instead.

- **`theQueueDemandsAnAsk.pins.ts` is genuinely type-checked**, proven by injecting a deliberate type
  error into it and watching `check-types` report it. `tsconfig.check.json` includes `src/**/*`.
- Dropping the ask in `authorisedWork` reddens 3 checks; in `authorisedHandles`, **6** — three on
  cancel, two on cancel-by-collection, one on run. All three job routes notice.
- **No toothless check found.**

**`/sp-review-comments`.** 11 candidate blocks, 11 verdicts + 2 MISSING: 3 KEEP, 3 REWRITE-COMMENT,
2 DELETE, 3 REWRITE-CODE. Inline density 0.6 per 10 — fine; the weight was in docblocks on internal
helpers.

The three REWRITE-CODE verdicts are the substance, and each replaced prose with structure:

- **A comment explained that a verdict is keyed by collection *and* id.** Now it cannot be otherwise:
  `refusedPerCollection` returns a lookup closure over a `Map<CollectionSlug, Set<string>>`, so an id
  is only reachable *through* its collection. `documentKey`, the composite string and two comments all
  disappeared. **Mutation**: flattening the map so ids are looked up without their collection reddens
  exactly the "keeps two collections apart" check.
- **A comment explained that a helper deduplicates.** Renamed to `distinctDocumentsByCollection`, so
  the name promises it — and its projection parameter went, because both callers passed the same one.
- **A docblock named `asWork`, which did not exist** — the cast was inline inside `input()`. Fixed the
  code rather than the prose: `asWork` now exists beside `asHandle`, the two forgeries sit together
  under names that say "cast", and the docblock is gone.

Also from the MISSING entries: `SyncRunnerProvider.test.ts` had been reaching the queue through
`authorisedByTheSave` — a path whose docblock argues from the editor's `afterChange`. The test is not
a save. It now forges with a local cast, like its neighbour, so the production path's name stays tied
to the real hook.

### Verification after every fix

`check-types` 0 · oxlint **43 warnings / 0 errors** — back to baseline after removing three imports
this rewiring orphaned · package suite **202 files / 2559 checks**, up from 201 / 2552 by exactly +1
file and +7 checks (6 brand-contract checks, and 1 from the per-source-file throw test for
`authorised.ts`) · real `turbo build` green, forced · integration **225 passed / 8 skipped** ·
`sp-diff-checks` clean · `sp-lint-delta` introduced nothing.

**The step removed more lines than it added** — 106 inserted against 137 deleted. The brand replaced
hand-written checks rather than accumulating on top of them.

### Owed to step 10

`@since` on `AuthorisedWork`, `AuthorisedHandle` and the three narrowed methods · a release-note line
for callers of the runner (implementers are unaffected) and for the brand types not being published.

## Amended 2026-10-26 — the brand split `dist` from `src`, and one consumer was mixing them

The brand is a `unique symbol`, so the built copy of `AuthorisedWork` and the source copy are
unrelated types. That is the mechanism working as designed — but it means any file importing the
package by name *and* by a path into `src/` holds two mutually unassignable `TaskRunner`s.

One file did: `apps/dev/src/integration/translator/task-runner-contract.int.test.ts` took
`createPayloadJobsRunner` from the published name and `assertTaskRunnerContract` from a deep path
into `src/server/modules/task-runner/__tests__/`. Repo-wide `check-types` has been failing on it
since this step landed, and nothing caught it: the per-step verification ran the **package's**
`check-types`, which does not see `apps/dev`.

**Fixed by publishing the suite rather than by weakening the brand.** `TaskRunner.invariants.ts`
moves from `__tests__/` to `src/testing/` and ships from a new `./testing` entry point, so both
imports resolve to one copy. The brand is untouched, and no minter is exported: `asWork` and
`asHandle` stay private to the module, and the brand types appear nowhere in the emitted
declarations — `grep Authorised dist/testing/*.d.ts` is empty. The suite does hand branded work to
the runner under test, as any caller of `enqueue` must; what it does not hand out is a way to mint
one.

**It also makes a promise true that could not be kept.** `TaskRunner.interface.ts` told a runner
author to call that suite once, while the suite lived in a directory the build excludes. The
docblock now names the published path.

`vitest` is declared an optional peer dependency. The suite imports it at module level, so it is
needed at **import** time: a non-test module importing the entry point fails at load, not when the
function is called.

**The verification step of every contract on this branch was too narrow.** It ran the package's own
`check-types`, its suite, its lint and the real build, plus the integration suites — but never
`turbo run check-types` across the repo, which is the only thing that type-checks `apps/dev`
against the built package. It is green now, 9 of 9.
