# The code reaches a person

Build step: 2026-10-28-the-provider-port.design.md #5

## Requirements / Task restatement

A provider says *why* it failed — `TranslationProvider` obliges a thrown error to carry a
`TranslationFailureCode`, and the five built-in error classes set one. Nothing reads it. Every
provider failure reaches the person as one sentence, `Translation failed. See the server logs for
details.`, because the only channel that reaches a person matches a marker in the message and no
marker is written from the code.

This step maps the five codes to `UserFacingFailureReason`, which already obliges copy per member,
and marks the message where a provider's throw crosses the port. Covers R14 of the design.

Out of this step: `ValueFailureCode`, the per-value refusal introduced when rich text began crossing
the port as segments. A value that fails leaves the rest of the document translated, so naming it to
a person is part of reporting a partial translation as partial — R15, its own step.

## What already exists — platform · installed · project · verdict

Nothing new is built. The whole mechanism is in the project already and this step applies it:

- `src/core/errors/failureReason.ts` — `UserFacingFailureReason`, `markFailureReason`,
  `readFailureReason`. A reason travels inside the message string. The ground given for that when
  the mechanism was introduced — Payload's job queue rethrows a handler failure as
  `new TaskError({ message })` and persists only `{ name, cancelled, message, stack }` — no longer
  holds in this code; see the last risk note. The file header that asserted it has been removed,
  so nothing in the code now states a reason review has disproved.
- `src/server/shared/http/toClientErrorMessage.ts` — `REASON_TEXT`, one entry per member, and the
  collapse that replaces an unmarked message with generic text outside development.
- Four error classes already mark themselves in their constructor — `SourceUnreadable`,
  `TranslationRefused`, `PermissionCheckFailed`, `RequesterMissing` — and `openAIComplete` marks an
  inaccessible model by hand.

No platform or library search: no hook, utility, wrapper or dependency is being added.

## Decisions

**D1 — the mark is written in the translation stage, where a provider's throw crosses the port.**
Rejected: write it in each of the five error classes' constructors, which is the precedent four
classes already set. That loses because a third-party provider throwing a plain `Error` with a
`code` would never be marked, and the design's D10 exists to make exactly that case work. It also
loses on coverage: `translateContent` is called from two independent places — the document route
through `translateOrWrap`, and the field route directly in its handler — so no single site outside
the pipeline sees every provider failure. The stage is the one place every call to a provider
passes through.

**D2 — reading the code is a separate function, not a change to `asTranslatorError`.** Rejected:
teach `asTranslatorError` to mark. That loses because its contract is that one of ours passes
through unchanged — stated in its docblock, pinned by a test — and marking would either mutate an
existing error's message or break that contract. The new function answers a different question:
given anything that was thrown, which failure code does it claim?

**D3 — an existing mark is never overwritten.** `openAIComplete` marks an inaccessible model as
`model-unavailable`; the general path would file it under the broader `config` instead. The stage
marks only a message that carries no marker yet, so the specific reason wins and the general one is
the fallback. What this buys is the *key*, not the wording: `toClientErrorMessage` answers from its
own catalogue and never shows the marked message's tail, so the sentence naming the model lives in
the log and nowhere else.

**D4 — the reason vocabulary is written once.** The members are spelled twice today: as the type
and as the runtime set. Five more members would double that. The list becomes one `as const` array,
the type is derived from it, and the set is built from it. `Record<UserFacingFailureReason, string>`
already forces the copy catalogue to cover every member, so the catalogue needs no second guard.

**D5 — the wrapper's `mustPropagate` is false, not carried over from the error it wraps.** The
first implementation took it from the existing `mustPropagate` helper, which is fail-safe: a
foreign error answers `true` on the assumption that it may already have rolled a write back. That
is wrong here and was caught in review. The wrapper exists only where a provider claimed a
`TranslationFailureCode` — a failure at the port, before any Payload operation ran — so the
caller's own write is intact. Carrying the flag over would have read a third party's plain `Error`
as foreign and reported a provider outage as a lost save, on exactly the third-party path D1 was
written to support. Rejected: branch on `cause instanceof TranslatorError`. That reads as though
`true` were reachable here; it is not, and every provider error in the package already answers
`false`.

**Placement.** The code-to-reason table lives with the stage that applies it, not in
`core/errors/`: that folder imports nothing today, and moving the table there would make it depend
on the provider port for one consumer's sake.

**New surface.** One table and one small reader, both with a single caller. They are not an
abstraction over two call sites; they are the step's own data and are inlined in the stage's folder.

**Shape check.** None of the triggers fire: no field is added to a published type
(`UserFacingFailureReason` is internal, not re-exported from `src/index.ts`), no two fields travel
together, no exported signature gains a parameter, nothing new is optional, and no two functions
split one question.

**Written contract.** `readFailureReason` already states that an unmarked message answers `null`.
The new reader owes one thing its signature cannot state: a value that is not an object, or carries
no recognisable code, answers `null` rather than guessing a code.

**Escalate?** No. One module, no new seam, no dependency, no data-model change.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R14 | Each of the five codes reaches a person as its own copy, not the generic sentence | `bunx vitest run src/core/translation-pipeline/stages/translation` | exit 0, five cases run |
| AC2 | R14 | A third-party provider throwing a plain `Error` with `code: "transport"` is marked the same as a built-in one | same file, the third-party case | exit 0, the case runs |
| AC3 | — | A message already carrying a marker keeps it: an inaccessible OpenAI model still names the model | `bunx vitest run src/translation-providers/openai` | exit 0, the case runs |
| AC4 | R14 | No vendor text reaches the person: a thrown error whose message holds an API key answers the catalogue's copy | the stage's test file, the leak case | exit 0, the case runs |
| AC5 | — | The reason vocabulary is spelled once | `grep -c '"source-unreadable"' src/core/errors/failureReason.ts` | prints `1` |
| AC6 | — | No new type errors | `bun run check-types` | exit 0 |
| AC7 | — | Nothing already passing breaks | `bunx vitest run` | 212+ files, no failures |
| AC9 | — | A provider failure is not mistaken for a rolled-back write: the wrapper answers `mustPropagate` false for a third party's plain error and for a built-in one | `bunx vitest run src/core/translation-pipeline/stages/translation` | exit 0, both cases run |
| AC10 | — | A wrapped provider failure still carries the `code` the port promises, so a host reading it in `onFailed` is unaffected | `bunx vitest run src/core/translation-pipeline/stages/translation` | exit 0, the case runs |
| AC8 | — | The built package still compiles with the real compiler | `bunx turbo run build --filter='./packages/payload-plugin-translator'` (from the repo root) | exit 0 |

## Pre-flight

Run against the untouched tree before any criterion was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1, AC2, AC4 | a probe calling `toClientErrorMessage` with `NODE_ENV=production` on a transport failure and on an empty reply | both answered `Translation failed. See the server logs for details.` — the generic text, no reason | change — must fail now, and does |
| AC3 | `bunx vitest run src/translation-providers/openai` | exit 0 | invariant — passes now |
| AC5 | `grep -c '"source-unreadable"' src/core/errors/failureReason.ts` | prints `2` | change — must fail now, and does |
| AC6 | `bun run check-types` | exit 0 | invariant — passes now |
| AC7 | `bunx vitest run` | 212 files, 2582 passed, 9 skipped | invariant — passes now |
| AC8 | `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 | invariant — passes now |

## Risk notes

- **The stage gains a `try`/`catch` it did not have.** Every provider failure now passes through one
  more frame. The catch re-throws, so no failure is swallowed; the test for an unknown throw — a
  string, an object with no code — pins that it travels on unchanged.
- **Two surfaces show the text**, and only one was exercised by hand: the run panel through
  `wireTranslateRunner`, and the route response through `withErrorHandler`. Both read the same
  marker, so the risk is that one of them collapses the message before the marker is read.
- **The copy is short by instruction and says less than the logs do.** Two of the five sentences
  state that nothing was saved, so a person does not have to guess whether the document was left
  half-written. The detail stays on `cause` and in the server log.

- **The marker in the message may be a workaround for a journey nothing makes.** The mechanism
  exists because Payload's job queue rethrows a handler failure as `new TaskError({ message })` and
  keeps only the text. Review of this step traced both delivery paths and found neither reads a
  failure back out of storage: the jobs runner keeps the original error in a `WeakMap` keyed by the
  job object and reports *that* object
  (`PayloadJobsRunnerProvider.ts:178, 230`), the synchronous runner reports the live error in the
  same call (`SyncTaskRunner.ts:69`), and what reaches a reader is already-resolved copy written
  into the run record. A `reason` field on `TranslatorError` would make the marker, its anchored
  regular expression and the precedence rule unnecessary. That is the design's own rejected option
  (c), whose stated ground — "a second field is gone before anything stores it" — does not hold in
  this code. Out of scope here: it touches about eight files and reverses a design decision. No
  migration would be needed, since no marker is persisted.

**D6 — the wrapper carries the provider's `code`.** The first implementation dropped it. That is a
published contract: `README.md` states that provider failures arrive as typed errors each with a
`code`, `TranslationFailureCode` is exported from `src/index.ts`, and `onFailed(task, error)` hands
the live error to the host. A host reading `error.code` would have got `undefined` for every
provider failure. The code is now a field on `TranslationFailed`, pinned by AC10 and a mutation, and
the code-to-reason table moved into that file so the constructor takes the code alone rather than
the code and the reason it determines.

**Still breaking, and the owner's to rule on.** `error instanceof TranslationProviderError` no
longer matches a provider failure that reached the host through the pipeline: the typed error is one
level down, on `cause`. `TranslationFailed` is not exported. This is a major release, so the break
is permitted, but it is not yet written anywhere a consumer reads. Two ways out — export
`TranslationFailed` and document it, or say in the README that the typed error now travels on
`cause`. The README is not edited here.

**Declined, with its reason.** Collapse the two vocabularies, so that the five
`TranslationFailureCode` members *are* members of `UserFacingFailureReason` and the table
disappears. Raised independently by two passes. It loses on two counts: the mapping is not
one-to-one over the whole vocabulary — five of the ten reasons arrive from access and permission
paths that carry no provider code at all — and it would make the published `@since 0.11.0` code
union double as user-facing copy keys, so rewording a key would be a breaking change.

## Decisions by the owner

- 2026-11-01 — the copy is written short, in plain words, with no technical terms; two sentences
  name that nothing was saved.
- 2026-11-01 — `ValueFailureCode` stays out of this step: naming a single failed value to a person
  belongs with reporting a partial translation as partial.
- 2026-11-01 — the duplicated reason vocabulary is repaired in this step rather than deferred, since
  five new members would double the duplication.
- 2026-11-01 — the specific OpenAI mark for an inaccessible model is kept; the general path becomes
  its fallback.
