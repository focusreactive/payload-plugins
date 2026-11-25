# A failure is visible and has a way out

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #6

Closes part of the hole that design names twice and leaves open: "a process that dies mid-run" and
"a process that died after writing and before settling". It came due in a running sandbox, by a
nearer route than a dying process — the queue's own bookkeeping refusing a write after the work had
already succeeded.

One correction to that design on the way: it says such a run "leaves a failed run row". It does not.
It leaves a **live** one, which is why the document stays blocked.

## Requirements / Task restatement

A translation ran, wrote its text, and the panel has said "translating" ever since. The run cannot
be cancelled, cannot be retried, and blocks every further run on that document. Nothing anywhere
says what went wrong.

The trigger was external and is not this task's to fix: a host that registers a jobs hook makes
Payload validate its own job rows, and Payload's success log entry omits a field its schema
requires. What this task fixes is that the plugin answers such a failure with silence and a lock.

- R7 (in, part) The admin offers nothing the server cannot answer — including an answer for a run
  that ended badly, and a control for a run that has not ended at all.
- R8 (in, part) Nothing is a silent no-op: a run that stops making progress becomes a visible
  outcome rather than a state nobody closes.
- (out) The external cause — another plugin's jobs configuration and Payload's own log entry.
- R8 (in, part) A locale is given one ending, and a later report does not overwrite it.
- (out) **Concluding anything about a run whose process was killed.** Nothing is inferred from
  elapsed time and nothing is reconciled against the queue; the editor's cancel is the way out, and
  it is one click. The reasoning is recorded as D4.
- (out) Anything else deferred past the major.

## What this starts from (measured)

Reproduced in the integration suite, red against the untouched code, with the sandbox's exact
error — `The following field is invalid: Status > Log`, retried to exhaustion:

- one live run record remains where none should (`expected 1 to be +0`);
- the host is told nothing (`expected [] to include 'de'`).

In the sandbox's own database the same run reads `started_at` set, `outcome` and `settled_at` empty.

- `PayloadJobsRunnerProvider.ts:189-201` — the workflow's `catch` reports an outcome only when
  `thrown.has(job)`, and that map is filled only by the plugin's own task handler (`:140`). An error
  raised around the handler rather than inside it reaches the `catch` with the map empty, so the
  loop over `owedIfGaveUp` never runs and nothing is reported.
- `owedIfGaveUp` (`model/owedIfGaveUp.ts:16-27`) is pure and already asks both of Payload's give-up
  conditions. It does not need the thrown map; the gate above is the only thing holding it back.
- `wireTranslateRunner.ts:116-150` — `report` already settles a record for `failed`, `abandoned` and
  `cancelled`, and notifies the host. The vocabulary this task needs exists.
- `localeRow.ts:38` — `case "running"` returns the row **without** `controls`, while `queued`,
  `failed` and `not-started` carry them. `LocaleActions.tsx:155` therefore falls to `default: null`
  and the row offers nothing.
- `LocaleActions.tsx:31` already documents the intent this contradicts: "nothing new may start, the
  run itself stays controllable".
- `cancel/handler.ts:55-78` finds **live** runs, including a running one, and `stop()`
  (`PayloadJobsTaskRunner.ts:141-168`) settles them as cancelled. The server side of the way out
  already works; only the control is missing.
- `reclaimStaleJobs` (`PayloadJobsTaskRunner.ts:198-214`) returns a job to the queue and does not
  touch run records, so no restart clears one.

## Decisions

### D1. The run is settled for any error once the queue has given up

- **Chosen:** remove the `thrown.has(job)` gate. Ask `owedIfGaveUp` on every error, and take the
  message from the plugin's own error when there is one, otherwise from the error that was caught.
- **Why it bites:** "did the plugin throw this" and "has the queue given up" are two different
  questions, and only the second decides whether a run is over. Gating the second behind the first
  means a run is closed only when the plugin itself failed — which is exactly the case that was
  already covered.
- **Rejected — keep the gate and add a second path for foreign errors:** two predicates over one
  question, and the second would have to re-derive what `owedIfGaveUp` already answers.
- **Rejected — report on the first error rather than on giving up:** it would close runs Payload is
  about to retry successfully.
- **Why the thrown map stays:** it carries the provider's typed error, which hosts match on
  (`gave-up-mid-run.int.test.ts` asserts the class, not the message). Losing it would downgrade
  every failure message to Payload's copy.
- **Constraint cited:** R8, and the lifecycle contract that a host is told once per locale.

### D2. A running locale offers a cancel, and only that

- **Chosen:** `translating` carries the run's locales like every other run state, and the actions
  render cancel for it. Not "run now": a second run against a document that still has a live one is
  what the admission rule exists to refuse.
- **Why it bites:** the editor's only escape is a control the panel declines to draw, while the
  route behind it already works. The props already promise it.
- **Rejected — leave the panel alone and document the route:** an editor cannot call an endpoint,
  and the lock is what they actually hit.
- **Rejected — offer retry as well:** it would either be refused by admission or start a duplicate.
- **Shape check fired** on "a field added to a published type": `LocaleRow`'s `translating` arm
  gains the same `RunControls` the other run arms carry, rather than a new shape of its own.

### D3. A run ends once, and the first ending is the one that counts

- **Found while building D1, by a test that already existed:** reporting every error, not only the
  plugin's own, made a cancelled run report a failure as well. Cancelling deletes the job row under
  the task that is running, Payload's own write then fails, and that failure arrived after the
  cancellation had already settled the record. The suite's wording for the rule it was defending:
  a machinery error is not a locale giving up.
- **Chosen:** a record that is already settled is left alone, and no further ending is announced for
  it. One guard where every ending passes, rather than a condition per caller.
- **Why there:** the same locale can be offered two endings by two honest paths. Deciding which one
  wins belongs with the writing of the outcome, not with each reporter.
- **Rejected — teach the workflow to skip locales it has already cancelled:** it answers the same
  question one caller later, and leaves every other reporter free to overwrite an ending.
- **Rejected — let the last ending win:** that was the store's stated rule, and a cancellation
  followed by the write it broke would read as a failure.
- **Corrected after review, which found the rule too broad.** A run can also be told to go again,
  and a retry keeps the handle of the attempt it repeats. Under "the first ending wins" a retry that
  worked left the row reading `failed` for ever, told the host nothing, and left the panel offering
  a retry that could never take. So the rule is scoped to one execution: **starting a run opens its
  row again**, and only endings offered to a row that is still closed are refused. A cancellation's
  broken write arrives with no start in between, so it is still refused; a retry's success is not.

### D4. Reconciling a stranded run against the queue is not built

- **Considered and dropped during execution, with the owner:** a state read could ask the queue
  whether a live run is really still running, and settle the ones it has finished with.
- **Why it lost:** after D2 the editor is never without a way out, so the reconciliation would save
  a single click in the one case the other two decisions miss — a process killed outright. Against
  that: neither state read holds a runner, so both would gain one; and a read that settles records
  is a read that writes, on a route the panel polls every twenty seconds and that answers under the
  host's own access rules.
- **What is left open, plainly:** a run whose process was killed is still closed by hand. Nothing
  concludes it automatically, and nothing guesses it from elapsed time.

**New surface:** none. One client arm gains the fields its siblings already carry, one `catch` loses
a condition, and the record store gains a rule rather than a member.
**Written contract owed:** none. The map that survives is explained where it is read.
**Escalate:** no — one module and one client arm, no new seam.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R8 | A task whose work succeeded and whose bookkeeping then failed leaves no live run | the reproduction, counting unsettled records for the document | **fails now** — `expected 1 to be +0` |
| AC2 | R8 | The same failure is announced to the host with the locale it belongs to | same file, over the lifecycle callback | **fails now** — `expected [] to include 'de'` |
| AC3 | R8 | A failure raised inside the plugin still carries the plugin's own error class, not a copy | `gave-up-mid-run.int.test.ts`, unchanged | **passes now** — stays-true, and the reason the thrown map is kept |
| AC4 | R8 | A run Payload will retry is not settled early | `final-failure.int.test.ts` and `cancel-after-giving-up.int.test.ts`, unchanged | **passes now** — stays-true |
| AC4b | R8 | A cancelled run is not also announced as failed when the cancellation breaks the write underneath it | `cancel-while-running.int.test.ts`, unchanged | **passes now** — stays-true, and it is what caught the first attempt at AC2 |
| AC5 | R7 | A locale whose run is in flight offers a cancel | a unit case over the row model, and one over the actions | **fails now** — the arm carries no locales and the actions fall through |
| AC6 | R7 | That locale is not offered a retry or a fresh run | same cases | **fails now** — nothing is offered at all, so the absence is not yet stated |
| AC7 | R7 | Cancelling a running locale settles it and frees the document | an integration case: cancel mid-run, then enqueue again and see it admitted | **passes now** — stays-true; the server side already worked, and the case records it |
| AC7b | R8 | A retry that succeeds replaces the failure it was started from, in the record and to the host | an integration case: fail to exhaustion, retry through the run route, assert the outcome and the callback | **fails now** — added after review found the first form of D3 swallowed it |
| AC8 | — | The baselines hold | package suite ≥ 3031 passed / 15 skipped · integration ≥ 299 passed / 7 skipped plus this task's cases · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured, with the preceding uncommitted work in the tree |

AC4 is the criterion this change is most likely to break: loosening when a run is reported as over
is exactly how a retry gets reported as a failure. AC7b is the one review had to supply — the first
form of D3 passed every criterion above and still broke the retry nobody had written a case for.

Two limits on the evidence, stated rather than left to be discovered. AC4b and AC7 live in a file
that runs on SQLite alone, because cancelling from inside a running job deletes a row that job's own
transaction holds; on the other adapters those two are skipped. And AC8's numbers were measured with
a separate, still-uncommitted change in the same tree, so they are a comparison against that tree
rather than against the commit.

## Risk

**High.** It changes when a run is declared over, on the path every queued translation takes, and
the lifecycle callbacks it drives are a published contract a host builds on. A run settled too early
tells a host a translation failed while Payload is still retrying it, and the document is freed for
a second run that then collides with the first.

AC3 and AC4 exist for that direction, and both pass against the untouched tree, so each is proved to
discriminate by a mutation rather than by its own run. Rollback is a revert: no stored shape changes.

The external cause stays. After this task the same configuration still fails every translation — it
fails visibly, with a message and a way out, instead of hanging.

## Decisions by the owner

- 2026-11-24 — the other plugin's jobs configuration and Payload's own validation are not this
  project's to repair; the plugin is responsible for answering the failure, not for preventing it.
