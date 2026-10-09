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

**D6 — `report` is required, not optional.** A runner that silently fails to implement it would
leave its host hearing nothing, and no compiler would say so. Required means a third-party runner
fails to build until it reports, which is the loudest available signal.

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
| 6 | A runner that does not implement `report` fails to build | compile-only fixture under `check-types` | removing `report` breaks the build |
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
