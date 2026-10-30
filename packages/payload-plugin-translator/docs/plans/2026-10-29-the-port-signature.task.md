Build step: ./2026-10-28-the-provider-port.design.md #2

# Step 2 — the port's signature

The first of the four breaking steps the reshape was split into (2 to 5 of the design's build
sequence).

## Requirements / Task restatement

Four positional arguments become two, and failure stops being reported by a return value.
Nothing the plugin *does* changes; what changes is what the signature says.

1. `translate(input, request)` replaces `translate(input, sourceLng, targetLng, options?)`.
2. `TranslationRequest` carries `sourceLng`, `targetLng`, `document` and `inlineMarks`,
   all required. `TranslationRequestOptions` goes.
3. The return is `Promise<TranslationOutput>`. No `| null`; failure is the throw that already
   happens.
4. `TranslationFailureCode` moves into `core/`, so a third party can name it without reaching into
   the built-ins.
5. `INLINE_MARKS_INSTRUCTION` is exported from `src/index.ts`.
6. `TranslationOutput` says in writing that its keys are a subset of the input's, and that a missing
   key means "not translated".

Covers R1, R2, R4, R5, R16 of the design.

**Out of this step, by the design's own sequencing:** `capabilities` is untouched (step 3 deletes
it); `inlineMarks` stays a field of the request (step 4 moves it onto the value); failure
codes do not yet reach a person (step 5); nothing deprecated is removed (step 6).

## What already exists — platform · installed · project · verdict

- **Platform.** Nothing used that the project does not already use.
- **Installed.** Nothing added.
- **Project.** Every piece of this step has a precedent in the package. `RunnerCapabilities` and
  `TaskRunner.interface.ts` are the sibling port, reshaped the same way in #213: a named options
  object, required fields, no `| null`, and no runtime guard on what an implementation returns.
  `@since 1.0.0` is already the tag in use (`plugin.ts:53`, `types/TranslatorAction.ts:5`).
- **Verdict.** Nothing is designed here that the package has not already decided once. The only open
  questions are placement, and they are answered below.

## Decisions

**Da — `TranslationFailureCode` lands in the port's own file, not a new one.**
Chosen: `core/domain/translation-providers/TranslationProvider.interface.ts`. Lost: a new
`TranslationFailure.ts` beside it · `core/errors/`, beside `TranslatorError`.
R7 and step 1's AC3 say that folder holds `TranslationProvider.interface.ts` and `index.ts`; a third
file reopens exactly what step 1 closed. `core/errors/` holds the classes *the plugin* throws, while
this is the vocabulary *a provider* throws with — which is the port's own contract (D3). The
package's naming convention tags role-bearing units, and a five-member string union is not one.
`shared/errors/TranslationProviderError.ts` imports it instead of declaring it; both barrels keep
re-exporting it, so the published surface does not move.

**Db — `TranslationRequest` is exported from `src/index.ts`.**
Chosen: export it, with `@since 1.0.0`. Lost: leave it unexported, as `TranslationRequestOptions` is
today.
`CLAUDE.md`'s test is whether a consumer can do its job without naming it. A provider written as
`class … implements TranslationProvider` gets **no** contextual typing for its method parameters, so
one that reads `request.targetLng` must name the type. That `TranslationRequestOptions` is
unexported today is the same gap, survivable only because the parameter is optional and most
implementations ignore it; with `request` required it becomes the normal case. `DocumentRef` stays
unexported — `request.document.collection` reads without naming it, and narrow is the cheap
direction.

**Dc — `document` becomes plainly required.**
Chosen: required on `TranslationRequest`. Lost: optional, mirroring today's `options?`.
The existing docblock already states that a half-description is not a state the core produces and
that only the *parameter* was optional. With the request itself required, that exception has nothing
left to ride on.

**Dd — `SystemPromptContext.document` becomes required as well.**
Chosen: required. Lost: leave it optional and unchanged.
`buildSystemPrompt` now always receives a document, so the optional marker admits a state the system
cannot produce. It is safe for consumers in a way the reverse would not be: a `SystemPromptBuilder`
*receives* the context and never constructs one, so a field becoming required only adds a guarantee.
**This is the one piece of scope beyond the step's six bullets** — it is one character, inside the
same breaking window, and it is the user's to cut at the gate.

**De — the `null` guard in `TranslationStage` is deleted, not kept as a runtime check.**
Chosen: delete `if (!translations) throw new TranslatorBug(…)`. Lost: keep it, guarding against a
provider written in JavaScript that returns `null` anyway.
`TranslatorBug` names *our* bug, and a third party breaking the contract is not one. The sibling
port sets the precedent: `runner.enqueue`'s return is consumed at
`server/features/enqueue-translation/handler.ts:128` with no runtime guard. An untyped provider that
returns `null` now fails on the next line instead of with a sentence — the same deal every other
port in this package offers.

**Df — `inlineMarks` is a field of the request for this step only, under its old name.**
Chosen: carry it on `TranslationRequest`, required, keep the name, and move it onto the value in
step 4. Lost: rename it to `valuesCarryInlineMarks` now · merge the two steps into one commit.
Steps 2–4 ship as one pull request, one commit per step, each green on its own. Nothing is released
between them, so the old name never reaches a consumer, and a rename step 4 deletes would be churn.
Separate commits keep the largest breaking changes reviewable one at a time.

### Shape check

Fired on two triggers: a type implemented outside this package changes, and four values that are
always set together are being named.

| For each candidate second argument | A: `TranslationRequest` object | B: codes stay positional, object holds the rest | C: one argument, input folded in |
|---|---|---|---|
| What the next field costs | 1 edit in the type, 1 at the single producer | same, but a language-shaped field has no home | same as A |
| States admitted vs produced | 4 required, 0 gap | 0 gap, but R1 is unmet — the codes stay swappable | 0 gap |
| Second caller already in the tree | `Translation.stage.ts`, plus every third-party implementor | same | same |
| What breaks outside the repo | every implementor rewrites the signature | the same break, for less | the same break, and the input stops being the obvious subject |

A. B fails R1 outright, which is the requirement that started this. C was already listed and
rejected as D1 of the design; the shape check reaches the same answer from the other side.

### Written contract

Yes, and it is the point of the step: `TranslationOutput` owes callers the subset rule (R16), and
`TranslationInput` owes key preservation. Both are stated in docblocks on the port.

**`/sp-red-test` is deliberately not run, and this is the reason.** Its discipline is for a contract
whose behaviour is new. Here no behaviour changes at all, and the 64 existing call sites across
three test files stop compiling the moment the signature moves — a red signal produced by the change
itself, over tests that were written against the old contract rather than from the new
implementation. A stub run would add ceremony and prove less.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | `translate` takes exactly two parameters, the second `request: TranslationRequest` | `grep -A3 "  translate(" src/core/domain/translation-providers/TranslationProvider.interface.ts` | two parameters, second named `request` |
| AC2 | R1 | A swap of the two language codes is caught | swap them in `translationRequest()` at `Translation.stage.ts`, run `bunx vitest run src/core/translation-pipeline/__tests__/TranslationPipeline.test.ts`, revert | the suite goes red on the swap and green after the revert |
| AC3 | R2 | No return type in `src/` carries `TranslationOutput \| null` | `grep -rn "TranslationOutput | null" src \| wc -l` | `0` |
| AC4 | R2 | A transport failure reaches the caller as the thrown error | `bunx vitest run src/translation-providers/shared/__tests__/CompletionProvider.provider.test.ts` | exit 0, every case runs |
| AC5 | R5 | `TranslationFailureCode` is declared under `core/` and imported by the built-ins | `grep -rn "export type TranslationFailureCode" src` | one hit, in `core/domain/translation-providers/TranslationProvider.interface.ts` |
| AC6 | R4 | `INLINE_MARKS_INSTRUCTION` is reachable from the package entry point | the consumer probe (below) type-checks | exit 0 |
| AC7 | R4 | It carries a version tag | `grep -B4 "INLINE_MARKS_INSTRUCTION" src/index.ts` | `@since 1.0.0` present |
| AC8 | R16 | `TranslationOutput` states the subset rule in writing | read its docblock | says keys are a subset and a missing key means "not translated" |
| AC9 | — | A third-party provider written as a class, reading the request, compiles against the published surface | the consumer probe | exit 0 |
| AC10 | — | The published surface only grows | `git diff -- src/index.ts` | additions only; no name removed |
| AC11 | — | No new type errors | `bun run check-types` | 0 errors |
| AC12 | — | No new lint findings | `bunx oxlint .` | ≤ 35 warnings, 0 errors |
| AC13 | — | The suite is green, and smaller by exactly the two cases this step's decisions retire | `bunx vitest run` | 207 files, 2529 passing, 9 skipped, 0 failing |
| AC14 | — | The real `tsc` declaration build passes | root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC15 | — | Behaviour is unchanged on every adapter | `apps/dev` after `bunx turbo run build --filter`, three adapters | SQLite 247+8 · PostgreSQL 253+2 · MongoDB 245+10, 0 failing |

**The consumer probe** (AC6, AC9) is `probe-consumer.ts` plus `tsconfig.probe.json` at the package
root, both temporary and deleted before the step ends. It imports only from `./src/index.js` and
contains a provider written as a class with `implements`, reading `request.targetLng` and
`request.document`, and a use of `INLINE_MARKS_INSTRUCTION`. The class form is what matters: an
object literal is contextually typed and would pass without the export, which is exactly how Db
could have been got wrong.

## Pre-flight

Run against the untouched tree on 2026-10-29.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | `grep -A3 "  translate("` on the interface | **FAIL** — four parameters | change |
| AC3 | `grep -c "TranslationOutput \| null"` | **FAIL** — 1 | change |
| AC5 | `grep -rn "export type TranslationFailureCode" src` | **FAIL** — declared in `shared/errors/TranslationProviderError.ts:8` | change |
| AC6, AC7 | `grep -c INLINE_MARKS_INSTRUCTION src/index.ts` | **FAIL** — 0 | change |
| AC8 | read the docblock | **FAIL** — says "Must have the same keys as input", which the built-in already breaks | change |
| AC9 | the probe, in its pre-change form | **PASS** — a class naming `TranslationInput`/`TranslationOutput`/`string` compiles today | invariant, and it is why the probe's class must read the *request* after the change |
| AC11 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC12 | `bunx oxlint .` | **PASS** — 35 warnings, 0 errors | invariant |
| AC13 | `bunx vitest run` | **PASS** — 207 files, 2531 passing, 9 skipped | invariant |
| AC14 | root `bunx turbo run build --filter` | **not run yet — see risk notes** | invariant |
| AC15 | three adapters | **PASS** — measured 2026-10-28: SQLite 247/8, PostgreSQL 253/2, MongoDB 245/10 | invariant |
| AC2, AC4, AC10 | — | no meaningful pre-flight: AC2 needs the new shape to mutate, AC4 is an existing green test, AC10 compares against this commit | — |

### Baselines captured before any edit

| Measure | Value |
|---|---|
| package suite | 207 files, 2531 passing, 9 skipped |
| type errors | 0 |
| lint | 35 warnings, 0 errors |
| `.translate(` call sites in the package | 67 across 6 files — 64 of them in three test files |
| hand-written `translate(` outside the package | 1 — `apps/dev/src/integration/translator/bootTestPayload.ts:130` |

## Risk notes

- **The real break is in the tests, not the source.** 64 of the 67 call sites are in
  `OpenAITranslation.provider.test.ts` (42), `CompletionProvider.provider.test.ts` (19) and
  `OpenAITranslationLegacy.provider.test.ts` (3). A mechanical rewrite of that many calls is where a
  silent weakening hides — a case that stops asserting what it asserted, or a request literal that
  quietly drops `document`. AC13's count is what catches a dropped case; it is not enough on its own,
  so the diff of those three files is read rather than skimmed.
- **`apps/dev` consumes the built package.** Integration run without `bunx turbo run build --filter`
  first grades stale code and its numbers mean nothing.
- **tsgo is not `tsc`.** `check-types` can pass while the declaration build fails; AC14 is the one
  that matters for a published type, and AC11 does not substitute for it. It was not run in
  pre-flight because it takes minutes on a cold cache — recorded here rather than assumed, per the
  pre-flight rule about slow checks.
- **`OpenAITranslationLegacy.provider.ts` is deleted by step 6.** It still has to be updated here, or
  the tree is not green. Updating code scheduled to die is the cost of each step standing alone.

## Human choices

- **2026-10-29 — the order.** "Сначала порт, потом читаемость" — the port is reshaped first, the
  providers' readability is its own contract afterwards.
- **2026-10-29 — modelling first.** "Да, прогнать" — the modelling run was required before the reshape
  was built. It ran, and withdrew D2; see the design's "Modelling — what it returned".
- **2026-10-29 — capabilities.** "да, убираем ProviderCapabilities", after the cost was stated:
  a provider that cannot preserve marks loses its degraded node-by-node path and leaves rich text
  untranslated instead. Removal is step 3, not this one.
- **2026-10-29 — the prerelease.** "Давай пока не будем разбираться. Нам самое главное чтобы потом
  выпустить 1.0.0 в конце" — the unexplained release of #213 is not chased now, and the reshape is not
  blocked on it.
- **2026-10-29 — no commits.** Every step stops with the files listed; staging and committing are
  the user's.

## Review log

### Build — 2026-10-29

| AC | Result |
|---|---|
| AC1 | **PASS** — `translate(input, request)`, two parameters |
| AC2 | **PASS** — see the deviation below; the mutation went red and the revert green |
| AC3 | **PASS** — `grep -rn "TranslationOutput \| null" src` → 0 |
| AC4 | **PASS** — `CompletionProvider.provider.test.ts` green, every failure case runs |
| AC5 | **PASS** — one declaration, in `core/domain/translation-providers/TranslationProvider.interface.ts` |
| AC6 | **PASS** — the probe type-checks |
| AC7 | **PASS** — `@since 1.0.0` on `INLINE_MARKS_INSTRUCTION` |
| AC8 | **PASS** — `TranslationOutput` states the subset rule and what an absent key means |
| AC9 | **PASS** — a class-based provider reading `request.targetLng` and `request.document` compiles; removing the export breaks it (below) |
| AC10 | **PASS** — `src/index.ts` gains `TranslationRequest` and `INLINE_MARKS_INSTRUCTION`; nothing removed |
| AC11 | **PASS** — `bun run check-types` → 0; `bunx turbo run check-types` → 9/9 |
| AC12 | **PASS** — 35 warnings, 0 errors (baseline 35/0) |
| AC13 | **PASS** — 207 files, 2529 passing, 9 skipped |
| AC14 | **PASS** — `bunx turbo run build --filter` exit 0, real `tsc` declaration build |
| AC15 | **PASS** — PostgreSQL 253+2 and MongoDB 245+10, both equal to the baseline to the test; SQLite 255 total, 0 failing, one case more than the baseline (below) |

### Deviations from the contract

**AC2 was unmeetable as written, and the mutation is what showed it.** It claimed the
type-checker would reject a swap of `sourceLng` and `targetLng`. It does not: both are `string`,
so `sourceLng: ctx.targetLng` is well-typed. Running the mutation produced **0 type errors** and a
red test. The criterion was rewritten to name the check that actually discriminates. R1 is still
met — there are no longer two adjacent positional strings a call site can transpose by accident —
but what catches a deliberate mis-assignment is a test, not the compiler, and the contract now
says so.

**Two test cases were retired on purpose, so the suite is 2529 rather than 2531.** Neither is a
dropped case; each guarded behaviour that a decision in this contract removes.

| Case | Decision that retired it |
|---|---|
| `CompletionProvider` — "leaves the builder without a document when the caller named none" | Dc: `document` is required, so a request without one cannot be built |
| `TranslationPipeline` — "throws when translation provider returns null" | De: the port forbids `null`, and the branch that caught it is gone |

Removing the second emptied `describe("error handling")`, which vitest then failed as a suite with
no tests; the empty block was removed too. **The pipeline now has no error-handling case at all** —
recorded as a gap rather than papered over. With `| null` gone there is no error branch left in
`TranslationPipeline` to exercise: a provider's throw propagates untouched. If step 3 or 4 adds one,
it needs its own case.

### Comment audit — 2026-10-29

23 added comment blocks, 23 verdicts, judged by an agent that saw the diff and the rules but not the
reasoning behind them. 10 deleted · 8 rewritten · 5 kept · 1 missing-note fixed by typing instead of
prose. Density came back **too dense on docblocks, clean on inline**: 50 docblock lines and 0 inline
comments over 187 lines of added code, with the port's own file carrying 29 of the 50 and **stating
the subset-of-keys rule four times** (`TranslationOutput`, the "Implementations must" list, `@param`
and `@returns`). It now states it once.

Three of the verdicts were mistakes of fact, not of style, and all three were mine:

- **`@since 1.0.0` on `TranslationFailureCode` was wrong.** The type has been exported from
  `src/index.ts` since 0.11.0; this step moved only its definition file. `CLAUDE.md` says `@since`
  marks additions and pre-existing API is not retargeted. Corrected to `@since 0.11.0`.
- **`sourceLng` is always set** (decided by the owner, 2026-10-30). Both entry points refuse an
  empty source locale (`enqueue-translation/model.ts`, `translate-field/model.ts`), so the plugin
  never sends one, and the docblock no longer offers an empty string as "auto-detect". Whether a
  provider guards against a missing language in its own prompt is the provider's choice; the
  built-in one's branch in `buildSystemPrompt` goes with step 6, as R10 says.
- **The `@example` on `TranslationProvider` violated the contract stated six lines above it** — it
  ignored `request.inlineMarks` and `request.sourceLng`. Deleted rather than repaired: a
  sample that breaks the rules it illustrates is worse than none.

Also removed: the sentence claiming a plain `Error` with `code` is enough (false — see the design's
D10), the three verbatim copies of one helper comment across three test files, and a
`request as unknown as Record<string, unknown>` cast in `translateContent.test.ts` that the audit
caught as a missing *why*. The cast was replaced by typing the recorder `TranslationRequest[]`,
which is what the owner's rule about casts asks for; it only existed because the old parameter was
optional, and that reason left with this step.

**The helper duplication was not fixed here.** `aRequest()` and `DEFAULT_DOCUMENT` are copy-pasted
into three test files; extracting one fixture module is a structural question and is left to the
abstraction and design-smell passes that follow.

### Found along the way

- **The 2026-10-28 SQLite integration baseline was stale, not beaten.** It recorded 247 passing / 8
  skipped; this run gives 248 / 7, with the total unchanged at 255 and nothing failing. The change in
  this step is adapter-agnostic, and PostgreSQL (253+2) and MongoDB (245+10) both matched their
  baselines to the test. Today's three runs are also internally consistent: SQLite skips exactly the
  four PostgreSQL-only files, PostgreSQL skips the two SQLite-only ones, MongoDB skips all six. One
  file that the 2026-10-28 run skipped for an environmental reason ran this time and passed.

- **The mechanical rewrite of 64 call sites damaged a string literal.** The regex that replaced
  `.translate(x, "en", "de")` normalised whitespace inside its first capture, turning a test's
  `{ 1: "   " }` into `{ 1: " " }` — a test caught it. It also swallowed a whole test body where a
  fourth argument made the pattern span two cases. Both were repaired, and then **every string
  literal in the three rewritten files was compared against `HEAD`**: the only losses are the
  literals of the one deliberately retired case, and nothing was gained that was not the new helper.
  That audit, not the suite count, is what makes the rewrite checkable — the count alone would not
  have shown the collapsed whitespace.
- **The `TranslationRequest` export is load-bearing, and that was proven rather than argued.**
  Removing it from `src/index.ts` fails the probe with `Module '"./src/index.js"' has no exported
  member 'TranslationRequest'`. Db stands.
- **One `buildSystemPrompt` case already named a document**, so the bulk edit gave it two; the
  duplicate was removed. The type-checker caught it.
- **`README.md` is not updated.** Package convention asks for a `Since vX.Y.Z` note beside a new
  public feature, and `INLINE_MARKS_INSTRUCTION` and `TranslationRequest` are two. The README is the
  owner's; proposed text is in the step's report, not written here.
