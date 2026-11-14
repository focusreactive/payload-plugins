# A locale nobody tried

Build step: 2026-10-28-the-provider-port.design.md #9

## Requirements / Task restatement

A run covers a document's whole locale list and walks it in one loop
(`PayloadJobsRunnerProvider.walkTheRunsLocales`). When a locale throws and the run has spent its
last attempt, the loop stops: every locale after it never starts. `owedIfGaveUp` then names those
locales, and each is reported `{ state: "failed", error }` — **with the error belonging to the
locale that threw**.

For a run over `de`, `fr`, `es` where `de` was delivered and `fr` exhausted its attempts, a person
sees two failures. One is real. The other is `es`, which nothing was ever asked about, carrying a
reason that is not its own.

Three consequences, all observable: the panel overstates how many translations failed; the reason
shown against `es` describes something that never happened to it; and `onFailed` fires once per
locale with the same error, so a host that counts failures, alerts on them or retries from that
callback over-counts and retries work that was never attempted.

**The reason the current behaviour exists is sound and must survive.** Nothing outside the stopped
loop knows about `es`. Reporting nothing would leave its row `pending` forever and the run would
never close. The choice was "failed" over "stuck", and the statement in `owedIfGaveUp` — *which
locales a run will never deliver* — is true. What is wrong is the one word that carries it to a
person.

This step gives that case its own settled ending, end to end: the runner reports it, the run record
stores it, the status route speaks it, the admin panel shows it, and the host hears about it.

Out of this step: R15 (a partial translation inside one locale reported as partial); re-attempting,
resuming or automatically retrying such a locale; any change to when a run gives up. The README is
not edited here.

## Is this R15?

No — it is R15's sibling, and the distinction is the reason this is its own step.

R15 is *a partial translation reported as partial*: a locale that **was** translated, where some
values came back unanswered, plus "translated but not published". Its subject is the content inside
one locale. This step's subject is a locale that was **never attempted at all** — no request was
sent, nothing was written, and there is no partial anything to report.

They share machinery — both widen `RunOutcome`, `TaskStatus` and the row vocabulary — and that
sharing is additive in both directions: a member added here costs R15 nothing, and R15's member
costs this nothing. They do not share a word: "incomplete" and "not attempted" are different things
to the person reading the panel, and collapsing them would re-create, one level down, exactly the
conflation this step exists to remove.

Building this now rather than inside R15 also means the lie stops being shown while R15's design is
still unwritten.

## What already exists — platform · installed · project · verdict

Nothing new is invented. The path this value travels already exists and already carries three
endings; this step adds a fourth member to a vocabulary that is already threaded end to end.

The precedent is **cancellation**, which took exactly this route: `owedOnCancel` sits beside
`owedIfGaveUp` in the same folder, `RunOutcome` already has `"cancelled"`, and `TranslationTask`
already has `onCancelled`.

That precedent is followed for the runner and the record, and **deliberately not followed at the
admin boundary**: `statusOf` maps a cancelled row to `null` and `reportedRuns` drops it, because
"the admin has no word for it". Dropping the row is the one thing this step must not do — the whole
point is that a person sees the difference.

## Decisions

**D1 — the case gets its own ending, rather than better prose on the existing one.** Rejected: leave
the behaviour and fix the documentation, saying in `onFailed`'s docblock that the error may not
belong to the locale. That is what the docblock **already says** today — *"for a locale that never
started is not its own, because nothing ran for it to throw"* — and the prose has not stopped the
panel from showing a wrong reason to a person, because a person does not read our docblocks.

**D2 — the run keeps stopping at the locale that threw.** Rejected: carry on to the next locale so
nothing is ever un-attempted, which would dissolve this task entirely. It loses on mechanism: the
throw out of the workflow handler **is** Payload's retry trigger, so swallowing it to continue would
mean re-implementing per-locale retry against the jobs runner, and on a run that is already failing
it would spend money on every remaining locale. Whether a run's locales should be independent of
one another is a real question and a larger one than this task; it is not answered here.

**D3 — the word is `abandoned`.** It says the run gave up on this locale without claiming anything
happened to it. Rejected: `skipped`, which reads as a decision not to translate (a filter, a rule)
rather than an ending forced by another locale's failure. Rejected: `not-attempted`, which is
accurate but is the only hyphenated member in a vocabulary of single words.

**D4 — an abandoned locale carries no error.** `{ state: "abandoned" }` has no `error` field, so
there is no channel through which another locale's reason can reach it, and `RunRecord.error` is
stored `null`. This is the decision that actually fixes what a person sees; the rest of the step
exists to let this one be expressed.

**D5 — the host hears about it through a callback of its own, `onAbandoned`, and `onFailed` no
longer fires for these locales.** Chosen over the two alternatives below on the window rather than
on taste, and this reverses the preference stated while the options were first weighed.

- Rejected: keep firing `onFailed` and add a third, optional argument distinguishing the two. It is
  the only option that stays available after 1.0.0, which is exactly why it looks attractive now and
  is the wrong reason to choose it: it leaves `onFailed`'s name false for a share of its calls
  forever, and the gap between what the name admits and what the system produces never closes.
- Rejected: report nothing to the host and settle the locale only in the run record. A host waiting
  for every locale of a run to close would wait forever — the same defect, moved from the panel to
  the host.

The cost of D5 is named rather than waved away: a host that counts locales through `onFailed` alone
stops hearing about abandoned ones, and that break is **silent** — the code still compiles. It is
mitigated the only way a silent break can be, by an entry in `docs/DEPRECATIONS.md` and a release
note, and it is affordable exactly once, in a major that is already asking consumers to rewrite
their plugin configuration.

**D6 — the admin shows the row; it does not drop it.** Against the `cancelled` precedent, for the
reason in the section above. The row keeps its Retry action, because retrying is precisely what a
person looking at an abandoned locale wants, and it is the one row state where retry is unambiguous.

**D7 — the dot is grey, and a new colour is not introduced.** `StatusDotColor` has five members and
`pending` already uses grey; the two are told apart by the row's own copy and by the fact that
`abandoned` is settled while `pending` is transient. Rejected: a sixth colour, which is a visual
decision belonging to whoever owns the admin's palette, not to this step. Recorded as the one piece
of this step a reader may want to revisit.

**D8 — the two endings are chosen at the call site, not by splitting `owedIfGaveUp`.** The loop asks
`dead === target`: the locale that threw is the failure, everything else the function returned was
never reached. Rejected: splitting `owedIfGaveUp` into "has the run given up" plus "which locales
are abandoned", which would make the distinction structural rather than a comparison. It loses on
proportion — it rewrites a function and its test file to express what one equality already says,
and `owedIfGaveUp`'s own docblock already defines the set it returns.

**D9 — the client learns the new status as a fifth member of its document-translation union, and
the collection-wide counts do not learn it at all.** `DocumentTranslationAbandoned` is added with no
`error` field, mirroring D4 on the other side of the wire. `ReportedStatus` excludes `abandoned`
alongside `completed`. Rejected: counting abandoned locales in the collection progress widget. It
loses on scope and on honesty: the server never produces that count today, so the widget would read
"none abandoned" where the truth is "not counted". Recorded as a named gap rather than half-built.

## Decisions by the owner

**D5 was taken to the owner at the gate and confirmed: `onAbandoned`, a callback of its own**,
accepting that `onFailed` stops firing for these locales and that the break is silent. The two
rejected alternatives are recorded under D5 above and are not to be re-argued.

**Placement.** No new module and no new seam. The value travels the path it already travels; each
file on it gains one member:

| File | Gains |
|---|---|
| `task-runner/types.ts` | `TaskEvent` variant `{ state: "abandoned" }`; `TaskStatus` member |
| `payload-jobs-runner/PayloadJobsRunnerProvider.ts` | reports `abandoned` for owed locales, `failed` for the one that threw |
| `runs/RunRecord.types.ts` | `RunOutcome` member |
| `runs/runStatus.ts` | `statusOf` maps it, `reportedRuns` keeps it |
| `features/translate-document/wireTranslateRunner.ts` | the `abandoned` case: settle with `error: null`, notify |
| `lifecycle/types.ts` | `onAbandoned` on `TranslationLifecycleCallbacks` |
| `lifecycle/LifecycleNotifier.ts` | `abandoned()` |
| `client/.../statusRows.ts` | `TranslationRowState` member, `toRowState` case, `STATE_DOT` entry |
| `client/.../TranslationStatusList.tsx` | the row's copy and its Retry action |
| `client/.../model/enums.ts` | `DocumentTranslationStatus.ABANDONED` |
| `client/.../model/types.ts` | `DocumentTranslationAbandoned`; `ReportedStatus` excludes it (D9) |
| `docs/DEPRECATIONS.md` | the entry D5 owes, plus a correction to the sibling entry that introduced the defect |

**New surface.** One published addition: `onAbandoned` on `TranslationLifecycleCallbacks`, with
`@since 1.0.0`. `TaskEvent` gains a variant; it is not exported from `src/index.ts` and is reached
by a third-party runner through `TaskRunnerContext.report`'s contextual typing, which an added
variant does not break — checked, not assumed (AC9).

**Shape check.** Fired on three triggers: a field is added to a published type; a new field is
optional; and `statusOf` plus `toRowState` are two functions answering parts of one question over
the same value.

| | A fourth `TaskEvent` variant (chosen) | `{ state: "failed", error, attempted: boolean }` |
|---|---|---|
| Next ending of this kind costs | one variant, and the compiler names every `switch` that must learn it | one more boolean, and no compiler help — every reader must know which combinations are real |
| States admitted / produced | 4 / 4 | 8 admitted (`failed`×`attempted`×`error present`), 3 produced |
| Second caller already in the codebase | `SyncTaskRunner` and `PayloadJobsRunner` both call `report` | same |
| Breaks outside this repo | nothing: an existing runner never produces the new variant | nothing, and nothing is fixed either — the lie stays reachable |

**The split predicate, named.** `statusOf` (server) and `toRowState` (client) both map an ending to
a word a person reads, over the same value, one on each side of the wire. `statusOf` owns *which
endings are shown at all* — it is the only place a row may be dropped, and it drops exactly
`cancelled`. `toRowState` owns *how a shown ending looks*, and owns no dropping. `toRowState`'s own
comment already warns that an unlisted status renders as `"translated"`, which would turn this
step's fix into a worse lie than the one it removes; AC6 is written against that specific trap.

**Written contract?** Yes: an abandoned locale is a **terminal** ending, at most one is reported per
locale, and it never carries an error. The first two are already `TaskRunnerContext.report`'s stated
contract and are inherited unchanged; the third is new and is pinned by AC2 rather than described.

**Escalate?** The "spans multiple modules" trigger fires — five modules and both layers. Not
escalated, and the reason is on the record: no seam is created, no pattern is introduced and no
dependency moves. The value already flows this exact path, and every file on it is adding a member
to a closed set the compiler then checks. The one decision that is genuinely the owner's is D5, and
it is taken to them at the gate rather than resolved here.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R20 | A locale the run never reached is reported `abandoned`, not `failed` | a runner test: three locales, the second throws on its last attempt, asserting the third's reported event is `{ state: "abandoned" }` | exit 0, the case runs |
| AC2 | R20 | An abandoned locale carries no reason | the same test asserting the event has no `error`, and the stored `RunRecord.error` is `null` | exit 0, both asserted |
| AC3 | R20 | The locale that actually failed still reports `failed`, with its own error | the same test asserting the second locale's event is `{ state: "failed", error }` carrying the thrown error | exit 0, the case runs |
| AC4 | R20 | The host is told, and told the truth | a lifecycle test: `onAbandoned` fires once for the abandoned locale, `onFailed` does not fire for it, and `onFailed` still fires for the one that threw | exit 0, all three asserted |
| AC5 | R20 | The admin is told, and the row is not dropped | a `runStatus` test: `statusOf` maps an `abandoned` record to `"abandoned"`, and `reportedRuns` keeps it | exit 0, both asserted |
| AC6 | R20 | The client does not render it as translated | a `statusRows` test: a run with status `abandoned` produces a row with state `"abandoned"`, not `"translated"` | exit 0, the case runs |
| AC7 | — | No database migration is needed | `grep -n '"outcome"' src/server/modules/runs/RunRecord.collection.ts` shows `type: "text"` | the column is text, not an enum |
| AC8 | — | Nothing already passing breaks | `bunx vitest run` | 210+ files, no failures |
| AC9 | — | A third-party runner still satisfies the contract without naming the new variant | `bun run check-types` with the apps in scope, plus `bunx turbo run check-types --force` | exit 0; 9/9 |
| AC10 | — | No new lint findings | `bunx oxlint .` | 34 warnings, 0 errors |
| AC11 | — | The real declaration build still passes | `bunx turbo run build --filter='./packages/payload-plugin-translator'` (repo root) | exit 0 |
| AC12 | — | The ending survives a real Payload boot | `bun run test:integration:sqlite` (from `apps/dev`, after AC11) | 62+ files, no failures |

AC1–AC3 are one test because they are one scenario: separating them would let a run pass two of
three while reporting the wrong thing. AC6 exists because `toRowState` falls through to
`"translated"` for any status it does not list — the failure mode it guards is not a wrong colour
but a locale with no translation being shown as translated.

## Pre-flight

Run against the tree as step 8 left it, before any criterion was written.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | `grep -rn "abandoned" src \| wc -l` | prints `1`, and the one hit is a word inside an unrelated comment | change — must fail now, and does |
| AC4 | `grep -rn "onAbandoned" src \| wc -l` | prints `0` | change — must fail now, and does |
| AC5 | `grep -c "record.outcome ===" src/server/modules/runs/runStatus.ts` | prints `3` | change — must fail now, and does |
| AC6 | `grep -n "TranslationRowState =" src/client/entities/translation/model/statusRows.ts` | five members, no `abandoned` | change — must fail now, and does |
| AC7 | the grep above | `{ name: "outcome", type: "text" }` | invariant — passes now, and is why no migration is owed |
| AC8 | `bunx vitest run` | 210 files, 2566 passed, 9 skipped | invariant — passes now |
| AC10 | `bunx oxlint .` | 34 warnings, 0 errors | invariant — passes now |

## Risk notes

- **D5's break is silent.** A host counting closed locales through `onFailed` alone keeps compiling
  and quietly stops hearing about abandoned ones. Nothing in the type system can catch it. The only
  mitigations available are the ledger entry and the release note, and both are owed by this step.
- **`toRowState` fails open, towards the worst answer.** Any status it does not list renders as
  `"translated"`. A locale that was never translated showing as translated is a worse defect than
  the one being fixed, which is why AC6 asserts the state rather than the appearance.
- **The admin's grey is now shared by `pending` and `abandoned`** (D7). They are distinguished by
  copy, not colour. If that proves too subtle in use, the fix is a sixth dot colour and it belongs
  to whoever owns the palette.
- **`SyncTaskRunner` does not have this defect and is not changed.** It translates one locale per
  call and reports `delivered` or `failed` for that locale alone, so it never settles a locale it
  did not attempt. Confirmed by reading its enqueue loop, not assumed from its name.
- **The document's aggregate trigger marker does not surface abandonment.** `RUN_STATUS_PRIORITY`
  ranks the four statuses that can win the single dot, and `abandoned` is not among them, so a
  document whose only signal is an abandoned locale shows the marker it would show anyway (stale, or
  none). Deliberate: the per-locale list carries the detail, and promoting abandonment to the
  aggregate would need a sixth `PanelStatus` kind and a tone for it.
- **The collection-wide progress widget does not count abandoned locales** (D9). A bulk run that
  abandons locales shows nothing there. Named rather than half-built; it needs a server-side count
  that does not exist.
- **Two integration specs pinned the old behaviour and were retargeted, not relaxed.**
  `final-failure.int.test.ts` asserted `onFailed` for both locales and now asserts the split across
  `onFailed` and `onAbandoned`, plus that nothing is abandoned when every locale was reached.
  `cancel-after-giving-up.int.test.ts` used "both locales failed" as its precondition for "the run
  is spent"; its first retarget replaced that with the union of both callbacks, which could no
  longer tell the old behaviour from the new one, and review caught it. It now asserts the split
  itself. Each spec ends with more assertions than it began with.
- **`Retry` on an abandoned row is the call the failed row already had.** D6 asserted it was the
  right affordance; what was checked afterwards is that it is not a new one. Both row states call
  `retry(row)` with `row.jobId`, the run's handle, through the same route to the same
  `runner.run(handle)`, which clears `hasError`, `processing`, `error` and `waitUntil` before
  re-queueing — so a run that gave up is re-runnable. This step pins the half it owns (the row
  carries the handle, AC6) and ships no new route behaviour. That no integration spec observes
  Retry end to end is a **pre-existing** gap: it is not covered for a failed row either.
- **Stored rows written before this step keep `outcome: "failed"`.** No backfill is attempted: the
  information needed to tell an abandoned row from a failed one — whether the locale was ever
  started — is not reliably recoverable from a settled record, and inventing it would put a guess in
  the place this step is clearing of one.
