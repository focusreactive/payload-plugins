# Cancel closes the record, not the queue

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #6

**Depends on the settle-once rule** from `2026-11-24-a-failure-is-visible-and-has-a-way-out.task.md`,
which is in the working tree and not yet committed. If the two are committed separately this one
goes second: without that rule, closing a record the runner has already closed would announce the
same ending twice.

## Requirements / Task restatement

A document shows "translating" and the cancel control does nothing about it. Measured in a running
sandbox: the route answers 204 twice over, and not one field changes.

Two tables are involved and only one of them drives the panel.

- `payload-jobs` is Payload's own queue. One row is a piece of work, and its input names the run
  handle and the locales.
- `translator-runs` is this plugin's table. One row is a run handle paired with one target locale,
  and the panel reads nothing else.

Cancelling walks the rows of `payload-jobs` it can find for the handles it was given, and closes
`translator-runs` rows from what each queue row says. Where the queue row has already gone, the
walk has nothing to walk, and the `translator-runs` rows stay open for ever.

- R7 (in, part) The admin offers nothing the server cannot answer: a control that answers 204 and
  changes nothing is worse than no control.
- R8 (in, part) Cancelling a run is not a silent no-op, whatever the queue still remembers.
- (out) Why a queue row goes missing. One route is already closed — a cancel that deleted the row
  without closing the records, which the preceding change fixed. Others are the host's business.
- (out) Anything else deferred past the major, and the sibling plugin and Payload themselves.

## What this starts from (measured)

Reproduced in the integration suite against the untouched code, with the queue row deleted after
the work was enqueued:

- the document is held by two open `translator-runs` rows;
- the cancel route answers 204;
- both rows are still open afterwards — `expected 2 to be +0`;
- the host hears nothing — `expected [] to deeply equal [ 'de', 'fr' ]`.

In the owner's sandbox the same state reads: `queued_at` set, `started_at` set, `settled_at` empty,
`outcome` empty, and no `payload-jobs` row for that handle.

- `cancel/handler.ts:61-63` reads `translator-runs` and holds the open rows, each already carrying
  its handle **and** its locale.
- It then passes handles alone to the runner: `AuthorisedHandle` is a branded `RunHandle`
  (`authorised.ts:17`), a string with no locale in it.
- `PayloadJobsTaskRunner.stop` (`:141-168`) reads `payload-jobs`, loops over what it found, closes
  the matching `translator-runs` rows through `report`, then deletes those queue rows.
- `TaskRunnerFactory` (`TaskRunnerProvider.interface.ts:64-67`) is internal — `src/index.ts` does
  not export it — and is built in one place, `wireTranslateRunner.ts`, which already holds the
  `report` that closes a record and tells the host.
- No test covers this: the two unit cases for cancelling both supply a non-empty list of queue rows,
  and every integration spec enqueues first, so a queue row exists by construction.

## Decisions

### D1. Closing a record is the plugin's own bookkeeping; stopping the work is the runner's

- **Chosen:** the cancel route asks the runner to stop what the queue still holds, and then closes
  every run record it was asked about that is still open.
- **Why it bites:** the two jobs have different sources of truth. What work remains is the queue's
  to answer; what the plugin promised is recorded in `translator-runs`, and the route is already
  holding those rows. Today the second job is done only as a side effect of the first, so it is
  skipped whenever the queue has nothing to say.
- **Rejected — teach the runner to close records with no queue row:** it is handed handles only, so
  it would need the locales, and that means widening a signature on the port third-party runners
  implement. The route has the locales already.
- **Rejected — the zero option:** the control stays a button that answers 204 and does nothing,
  which is what prompted this.
- **Safe against double endings** because a record that has ended refuses a second one. The route
  therefore reports for every row it was asked about and lets that rule drop the ones the runner
  has already closed, rather than working out which are left over.
- **Constraint cited:** R8, and the rule that a record settles once.

### D2. The route is given the reporting path, not a second way to write

- **Chosen:** the internal runner factory carries `report` alongside `create` and `capabilities`,
  and the cancel route uses it.
- **Why it bites:** closing a record and telling the host are one act — `report` does both. Writing
  to the record store directly from the route would close the record and tell nobody, which is the
  silence this work has spent the day removing.
- **Rejected — the route writes through the record store:** three lines, and a locale that ends
  without the host hearing it.
- **Rejected — hand the route the whole runner context:** it carries `handler` as well, which is the
  path that performs translations; a cancel route has no business holding it.
- **Shape check fired** on "a field added to a type several callers read". `TaskRunnerFactory` is
  internal and built in exactly one place, so this is not a published surface; the one consumer is
  the cancel route, and that is stated rather than hidden behind a second imagined caller.

**New surface:** one field on an internal type. **Written contract owed:** yes — the route owes its
reader why it reports for rows the runner may already have closed.
**Escalate:** no — one route, one internal type, no stored shape.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R7 | Cancelling a document whose queue rows are gone leaves no open run record | the reproduction, counting open records before and after | **fails now** — `expected 2 to be +0` |
| AC2 | R8 | The host is told what became of each locale of such a run | same file, over the cancellation callback | **fails now** — `expected [] to deeply equal [ 'de', 'fr' ]` |
| AC3 | R8 | A locale the runner already closed is not announced twice | `cancel-announcement.int.test.ts`, unchanged | **passes now** — stays-true, and the rule this change leans on |
| AC4 | R8 | A run that gave up before the cancel is still not reported as cancelled on top of its own ending | `cancel-after-giving-up.int.test.ts`, unchanged | **passes now** — stays-true |
| AC5 | R7 | Cancelling a run that is genuinely in flight still stops the queue work | `cancel-while-running.int.test.ts`, unchanged | **passes now** — stays-true |
| AC6 | — | A run the caller may not touch is still refused, and cancelling does not become a way to close someone else's record | `access-control-queue.int.test.ts`, unchanged | **passes now** — stays-true |
| AC7 | — | The baselines hold | package suite ≥ 3032 passed / 15 skipped · integration ≥ 303 passed / 7 skipped plus this task's cases · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured with both preceding changes in the tree |

AC6 is the one this change is most likely to break by accident: the route gains the power to close a
record without the runner's involvement, and authorisation must still stand between a caller and a
record that is not theirs.

## Risk

**High.** Cancelling is a write on a shared path, it drives a published lifecycle callback, and this
change gives a route the ability to end a run without the runner agreeing. Three ways it could go
wrong: a record closed for a caller who was refused; an ending announced twice; a run still in
flight closed in the record while a worker keeps writing its text.

The third is the one worth naming, because it is not new — cancelling has never stopped a locale
already being translated, and the runner's own contract says so. What changes is that the record now
closes in that case rather than staying open, which is the intent: the record describes what the
plugin promised, not what a worker is doing.

Rollback is a revert; no stored shape changes.

## Decisions by the owner

- 2026-11-24 — the work is kept to this one defect. Neighbouring gaps found along the way are not
  folded in.
