# One channel for task events

Supersedes parts of [2026-10-06-lifecycle-run-context](./2026-10-06-lifecycle-run-context.task.md),
whose `reportsFinalFailure` / `reportFinalFailure` pair this replaces before either ships.

## Task restatement

Everything the plugin tells a host application currently leaves from three places: a wrapper
around the runner (`queued`, `cancelled`), a catch inside the translation handler (`completed`,
`failed`), and a callback the plugin hands the runner (`failed`, for locales a run gave up on).
A boolean on the provider — `reportsFinalFailure` — picks between the last two.

Replace all three with one obligation on the runner: **tell the plugin what happened to each
assignment it accepted.** The plugin turns that into the host's callbacks. The runner still knows
nothing about the host.

## The constraint that shapes it

For the Payload-jobs runner **the plugin is not on the call stack**: Payload's scheduler calls the
registered workflow, which calls the registered task, which calls the translation function the
plugin handed over. Nothing can be returned "up" to the plugin, because what is up is Payload. So
the channel has to be a callback the plugin gives the runner, not a return value.

## Decisions

**D1 — one method, covering the whole life of an assignment, not only its end.**

```ts
report(assignment: EnqueueAssignment, event: TaskEvent): Promise<void>
```

*Rejected: terminal-only (`onSettled`), with the plugin reporting `queued` itself.* The plugin
cannot: the synchronous runner translates inside `enqueue`, so a `queued` raised after `enqueue`
returns would arrive after `delivered`, and one raised before it would have to be duplicated at both
call sites that enqueue (the HTTP route and the auto-translate hook). Only the runner knows the
timeline of work it accepted. **Owner's choice, taken at the Phase 2 gate.**

**D2 — four events, not five.**

```ts
type TaskEvent =
  | { state: "queued" }
  | { state: "delivered" }
  | { state: "failed"; error: unknown }
  | { state: "cancelled" };
```

*Rejected: a fifth `abandoned` for a locale a run never reached.* The plugin maps both it and
`failed` to the host's `onFailed`, so the distinction would be discarded one line later — surplus
information in a contract third parties must implement. `failed`'s docblock states that for a locale
that never ran, the error is the one that ended the run rather than its own. Re-introducing the
distinction later is additive and cheap.

**D3 — `EnqueueAssignment` carries the whole identity of the work.** It gains `sourceLng` and
`strategy`, so one mapper turns it into the host's `TranslationTask`.

*Rejected: a richer argument to `report`.* The three mappers that exist today
(`taskFromInput`, `taskFromHandlerInput`, `taskFromStored`) exist precisely because the event
arrives in three shapes; one channel should mean one shape and one mapper. The two added fields are
data the runner already holds at every point it reports. The HTTP enqueue answer keeps its four
fields — the wire mapper picks, it does not mirror.

**D4 — the runner receives the context, not just the handler.** `create(payload, handler)` becomes
`create(payload, context)`, the same `TaskRunnerContext` that `configure` already takes.

*Rejected: a third parameter on `create`.* Both runners need `report` in two different places — the
synchronous one inside `enqueue`, the jobs one inside `cancel` and inside the registered workflow —
and `configure` already hands over a context object. One object beats a growing parameter list, and
`create`'s signature is breaking either way.

**D5 — `findByIds` leaves the contract.** Its only consumer was the plugin's cancellation
announcement, which no longer exists: the runner knows what it still owed and reports `cancelled`
itself. **Owner's choice, taken at the Phase 2 gate.**

**D6 — `report` is required on the context, not optional.** Optional would mean the plugin could
ship a context without it and leave every host silent, with no compiler complaint. Required makes
that a build error in every file that supplies or reads a context.

What it does **not** do is oblige a runner to call it: no type can require that a function be
called, and the `silent` fixture in `TaskRunner.conformance.types.ts` compiles while never reporting
anything. The obligation to report lives in the contract prose and in the invariant suite, which is
where a runner's behaviour can actually be held to it.

**D7 — five sentences the first draft left out, added before any implementation.** A blind author
writing the invariants against the contract alone found them, each as a question it could not answer
without guessing: when a report is observable (before the causing call resolves); that the reported
assignment carries the handle the enqueue answer gave; that a locale an existing run already covers
still earns its `queued`; that `cancelled` only ever follows a `cancel`; and that a locale already
reported `failed` is not owed. All five are now in `TaskRunnerContext.report`.

Two it raised are deliberately left unstated: the order within the cancelled-then-delivered
exception, and whether `sourceLng`/`strategy` on a reported assignment must equal the request's —
the handle is the identity, and promising more would be promising what nothing needs.

## What disappears

| Thing | Why it can go |
|---|---|
| `TaskRunnerProvider.reportsFinalFailure` | nothing to switch between — one channel |
| `TaskRunnerContext.reportFinalFailure` | replaced by `report` |
| `withQueuedNotification.ts` and its 24 checks | the runner reports; nothing to decorate |
| `TaskRunner.findByIds` | D5 |
| the reporting catch in `runnerContext.handler` | the runner reports failure, not the handler |
| `LifecycleNotifier.cancelling` | the runner supplies the tasks; no read to own |
| two of the three mappers in `taskMapping.ts` | D3 |

## Acceptance criteria

| # | Criterion | How it is checked | Evidence of done |
|---|---|---|---|
| 1 | `reportsFinalFailure` exists nowhere | grep over `src` | no hits |
| 2 | `withQueuedNotification.ts` is deleted | file check | absent |
| 3 | `TaskRunner` has no `findByIds` | grep the interface | no hits |
| 4 | `taskMapping.ts` exports exactly one mapper | grep count | 1 |
| 5 | `EnqueueAssignment` carries `sourceLng` and `strategy` | type check of the fixture | compiles |
| 6 | Nothing can build a `TaskRunnerContext` without `report` | compile-only fixture + mutation under `check-types` | removing `report` from the context breaks the build wherever one is supplied or read |
| 7 | A host registering `onQueued` hears it once per requested locale, before any terminal event for that locale | integration, real database, both runners | order asserted |
| 8 | A locale that fails twice then succeeds fires `onFailed` zero times and `onCompleted` once | integration, failing provider | counts |
| 9 | A locale whose run gives up fires `onFailed` exactly once | integration | one call |
| 10 | A locale a run never reached fires `onFailed` too | integration, two locales, first fails terminally | both reported |
| 11 | Cancelling fires `onCancelled` once per locale the run still owed, and not for delivered ones | integration | set equality |
| 12 | Every assignment gets at most one terminal event — except a locale already executing when cancelled, which may still settle as delivered | invariant suite, both runners | asserted, with the exception named |
| 13 | The host-facing surface is unchanged: `TranslationLifecycleCallbacks`, `TranslationTask`, `createPayloadJobsRunner`, `createSyncRunner`, the HTTP responses | diff review + existing integration suite | no change |
| 14 | Nothing else regresses | three checks + the integration matrix, three adapters × exclusive queue | at or above baseline |

## Criteria pre-flight — run 2026-10-08 against the untouched tree

| # | Result now | Reading |
|---|---|---|
| 1 | fails — `reportsFinalFailure` is in `TaskRunnerProvider.interface.ts` | correct polarity |
| 2 | fails — the file exists | correct |
| 3 | fails — `findByIds` is on the interface | correct |
| 4 | fails — three mappers | correct |
| 5 | fails — neither field is on `EnqueueAssignment` | correct |
| 13, 14 | **pass** — 2027 unit / 143 files, `check-types` 0, oxlint 55-0, integration 212 on SQLite | a must-stay-true criterion, green before the change |

## Risk

**High.** A public contract implemented outside the package, two implementations, and every
host-visible event flows through it. Consequences, per the workflow: the gate was taken with an
explicit question, tests are required rather than optional, the Phase 4 sweep must name what was
grepped, and Phase 5 uses three review angles.

## Human choices

- **One channel including `queued`, not terminal-only** — D1, chosen at the gate over the plugin
  reporting `queued` itself.
- **`findByIds` removed** — D5, chosen at the gate over keeping it as a capability.
- Not changing the unit of work from document to locale: rejected for this iteration, recorded in
  the conversation that produced this task.
- `README.md` is the owner's; this task does not touch it.
- No tracker issues.

## Known gap, carried forward

Cancelling does not stop a locale already being translated: it is reported `cancelled` and may then
settle `delivered`, so that one locale produces two events. Criterion 12 names the exception rather
than pretending otherwise. Closing it means changing what cancellation does, which is its own work.

## Review log

_(appended by each review pass)_

### 2026-10-09 · phase 5 verification

- **Checks:** unit `bunx vitest run` 2017/143 files · `turbo run check-types --force` 9/9 ·
  `bunx oxlint` 0 errors · `turbo run build --filter='./packages/*'` green, including the real
  `tsc` declaration build · integration six combinations, three adapters x Payload's exclusive queue on and off:
  SQLite 224/7 skipped, PostgreSQL 229/2, MongoDB 222/9 (231 each), no failures
- **Gates:** `sp-diff-checks` clean over 67 files (+4020/−463), five checks, no findings;
  `sp-lint-delta --base main` (mode=two-run) nothing introduced — one warning it did find, an unused
  `assigned` binding in `SyncTaskRunner.test.ts`, was removed. oxlint's default output is not
  parseable by the delta script; the gate was re-run with `--format=unix` to get a real subtraction.
- **Reviewers:** correctness · regression · intent (three, as High risk requires; the catalog has no
  `tests` vector, so its question — would these checks fail if the code were wrong — was folded into
  the correctness brief). Five findings raised, five acted on.
  1. *correctness* — `cancel` re-announced a locale the run had already reported `failed`.
     `stillOwed` keeps every locale that is not `completed`, and a run that gives up keeps
     `hasError` with no `completedAt`, so its settled locales still read as owed. Reproduced on
     SQLite before any edit. Fixed by `owedOnCancel`, which answers the cancel path's own question:
     a spent run owes nothing, a run waiting to retry owes its undelivered locales.
     **Not taken: the reviewer's one-line fix** (`status !== "failed"`), which would have silenced
     the legitimate case — a job between attempts logs every locale as failed and those locales are
     genuinely still owed. `owedOnCancel.test.ts` pins both directions.
     **Not changed: `cancel-by-collection/handler.ts`**, named as a sibling. Its filter is right;
     whether a run has given up is the runner's knowledge, so the guard belongs where it now is. The
     integration suite exercises that endpoint too.
  2. *intent* — criterion 7 had no check at all: no integration file registered `onQueued`.
     Written now, one per runner (`queued-before-any-ending.int.test.ts`,
     `queued-before-any-ending-on-jobs.int.test.ts`), each mutation-proved.
  3. *regression* — `TranslationTask.handle` documented itself as absent on `onQueued`. False since
     the runner became what reports `queued`: every callback carries the handle. Rewritten.
  4. *regression* — `wireTranslateRunner`'s docblock still described the deleted decoration.
  5. *regression* — `DEPRECATIONS.md` pointed a reader at the removed `reportsFinalFailure`; it now
     points at `report`'s `failed` event. One stale code-ref line beside it was corrected too.
  Considered and not acted on: a cron racing the end-of-`enqueue` `queued` loop. The contract
  promises `queued` before `enqueue` resolves, not before anything external can run, and the new
  jobs-runner check pins exactly that promise.
- **Mutations:** removing `report` from `TaskRunnerContext` → build fails in 9 files · narrowing
  `enqueue` to require assignments → the conformance fixture alone fails · reporting `queued` after
  the work in `SyncTaskRunner` → "de ended before the host was told it had started" · deleting the
  jobs runner's `queued` loop → both new jobs checks red · `owedOnCancel` without the give-up guard
  → the cancel-after-give-up checks red. Every mutation restored and the restore verified.
- **Criteria:** 13 met · 1 restated. Criterion 6 as written ("a runner that does not implement
  `report` fails to build") is false and the repository holds its counter-example: the `silent`
  fixture never calls `report` and compiles, because no type can require that a function be called.
  The criterion and D6 now claim what the type actually enforces — that nothing can build a context
  without `report` — and the fixture's docblock says the same.
- **Left open:** `README.md`'s lifecycle section still describes the per-attempt behaviour; it is the
  owner's to edit. The handle-reuse limit on SQLite stays named in the contract rather than fixed.
