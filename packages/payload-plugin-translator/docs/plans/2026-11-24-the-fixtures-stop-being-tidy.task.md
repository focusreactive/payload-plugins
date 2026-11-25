# The fixtures stop being tidy

## Requirements / Task restatement

Four defects were found by hand this week, in code the integration suite already covered. None of
them was an uncovered feature. Three were covered by a neighbouring spec whose fixture or starting
state was uniform with every other spec's, and the fourth was covered by a spec that asserted the
wrong thing.

This task does not add scenarios. It varies the axes along which all 81 integration specs are
identical, so that a shape the suite has never seen is seen once.

- R1 (in) Each named axis is probed by one spec that provably reaches the state it claims.
- R2 (in) A probe that passes closes its axis, and says so. A probe that fails is a defect found,
  recorded beside the code rather than carried in someone's head.
- R3 (in) Whatever a probe finds is fixed here, each fix in its own commit.
- R4 (out) New scenarios, new tiers, a browser-level suite. The common paths are covered.

## What this starts from (measured)

- 81 specs under `apps/dev/src/integration/translator/`, each booting a real Payload against a real
  database. Four widget tests cover the admin, against an in-memory repository.
- The shared fixture (`testCollections.ts:44-81`) gives `docs` a group, an array, a blocks field,
  tabs and a richText — **every container directly under the collection root, none inside another**,
  and every container holding exactly one localized leaf.
- `runHooks` appears in one spec, written this week. `exclusiveQueue` is not set by any spec: it
  defaults from `EXCLUSIVE_QUEUE`, and `package.json:33-36` offers a whole alternate suite run for
  it.
- All four `cancel-*` specs begin with `POST /translate/enqueue`, so a queue row exists by
  construction in each.
- `blocks-by-reference.int.test.ts:19-22` does nest a blocks field inside a block, by reference.
  Its inner block holds one localized leaf.
- **No workflow runs any test.** `.github/workflows/` holds a release and a preview cleanup; the
  release job installs, builds and publishes. Every suite in this repository runs by hand.
- The defect that produced axis 1 can no longer occur by its original mechanism:
  `localesHoldingContent.ts:37-64` now reads the documents and decides in memory, so there is no
  per-field SQL condition left to collide. What the probe reaches instead is the in-memory walker.

## Decisions

### D1. Five probes, derived from the four defects, not from a scenario list

- **Chosen:** one probe per gap that a real defect pointed at — two on document shape, two on a
  host that changes the jobs config, one on a starting state nothing can reach by enqueueing.
- **Why it bites:** the common paths already have 81 specs and still let four defects through. A
  sixth spec about a common path buys nothing; a first spec about an unseen shape buys the class.
- **Rejected — brainstorm the most frequent scenarios:** that is what the suite already is.
- **Rejected — one probe per axis (three):** the two host-config paths differ in which code runs
  (cancel versus the auto-translate hook), and the owner's own installation exercises both.

### D2. A probe that fails is fixed in this task, in a commit of its own

- **Chosen:** a red probe is a defect found days before a major, and it is repaired here. The probe
  is committed with its fix, and the red output is recorded before the fix is written.
- **Why it bites:** a finding parked behind a skip still ships. The reason to probe now rather than
  after the release is that there is still time to act on what is found.
- **Consequence, stated rather than discovered:** this task's size depends on what the probes turn
  up. A fix that needs its own design goes back to the gate instead of being improvised, and each
  fix is its own commit so that the findings and the repairs stay separable in the history.
- **Rejected — commit the probe skipped, naming the defect:** it records the defect honestly and
  ships it anyway.
- **Rejected — leave the probe red:** a red suite stops being read within a day, and every later
  task would have to tell its own breakage from this one.

### D3. The runner axis is deferred, and the exclusive-queue axis is reported rather than probed

- **Deferred — synchronous runner against queue runner in the same specs:** no defect pointed at
  it, and the runner port already has a conformance suite both runners pass.
- **Reported, not probed — `exclusiveQueue`:** a whole alternate suite run already exists for it.
  The finding is that nothing runs it, which a spec cannot fix.

**New surface:** none — five spec files and no production code.
**Written contract owed:** none.
**Escalate:** no.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1, R2 | A blocks field nested inside a block, holding a localized leaf at each level, is translated into the target locale and both leaves are named by the document state | a new spec, reading the target locale's document and the state route | **fails now** — no fixture nests a container holding its own localized leaf |
| AC2 | R1, R2 | An array row holding two localized leaves is translated, and both leaves land | a new spec, same two reads | **fails now** — no fixture gives one array row two localized leaves |
| AC3 | R1, R2 | With the host validating its own job rows, cancelling a running translation closes every record and tells the host | a new spec booting `runHooks: true`, reading `translator-runs` and the cancel callback | **fails now** — `runHooks` is booted by one spec, on one path |
| AC4 | R1, R2 | With the host validating its own job rows, publishing a source document still translates its targets | a new spec booting `runHooks: true` with auto-translate | **fails now** — same |
| AC5 | R1, R2 | A document whose run record is open with no queue row behind it is reported by the document-state and list-state routes without failing | a new spec that deletes the queue rows, asserts none remain and the record is open, then reads both routes | **fails now** — that state is reached by one spec, which only cancels from it |
| AC6 | R2 | Every probe passes in the committed tree, and any probe that was red first carries its fix in a commit of its own, with the red output recorded before the fix | the suite's own result, and the commit history | **passes now** — vacuously, and the direction this task could break |
| AC8 | R3 | A locale whose run never started says there has been no news once it outlives the same window, and reads as queued before that | two component cases over the status | **failed before the fix** — the window covered only a run in flight |
| AC7 | — | The baselines hold | package suite ≥ 3035 passed / 15 skipped · integration ≥ 306 passed / 7 skipped, 0 failed · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured at 84e0ee98 |

AC6 is the one most easily lost: a probe that goes red is the moment the task stops being tidy, and
the cheap way out is to soften its assertion until it passes.

## What the probes found

- **Document shape — closed.** A blocks field inside a block, with a localized leaf at each depth,
  is translated at both depths, and the field picker offers five addresses for a fixture that holds
  five translatable leaves. One list row holding two localized leaves translates both. The walker
  descends; nothing was wrong.
- **A host that validates its own job rows, cancelling — closed.** Every record closes as
  cancelled and the host is told about both locales.
- **A host that validates its own job rows, auto-translating — closed, after the probe was
  corrected.** It failed on its first run, and the probe was at fault: the queue's default policy
  defers each retry by seconds while the test drains in milliseconds, so the records were read
  while the run was still legitimately retrying. With the retry policy the suite's other queue
  specs use, the text lands and the locale is recorded delivered.
  - Worth naming, though it is not this task's: while the queue retries that failure the record
    stays open and every attempt translates again, although the text landed on the first attempt.
    This was recorded as out of scope when the ending was corrected, and it still is.
- **Reading a document whose work is gone — a defect, fixed here.** Both state routes answer, and
  they report each locale as `queued` rather than `running`, because nothing ever started the work.
  The sentence added the same day covered only a run in flight, so a run whose work vanished before
  it started read `Queued` for ever, with no hint and no elapsed time.
  - The fix gives the queued row the same window. Alongside it, the client model's `startedAt` is
    renamed `queuedAt`: the server has always sent the moment the run was queued
    (`runStateOf.ts:64`), for a running run as well, so the old name claimed something no value in
    it ever carried, and the panel's wording followed the name.

## Risk

**Low for the tree, and that is not the interesting part.** No production code is touched, so
nothing can regress; the worst mechanical outcome is a slower suite. The real exposure is the
opposite one — a probe that goes red says a shipped behaviour is wrong, days before a major. That
is the point of running them now rather than after.

One cost of the fix is worth stating rather than discovering. The window means "longer than one
document's translation", which is what a run in flight is waiting for. A queued run is waiting for
the queue instead, and a backlog larger than the cron's batch can hold it there honestly for longer
than the window. The panel will then say there has been no news about work that is fine and will
run. That is accepted on the same ground as the rest of this sentence: the controls beside it are
the same either way, the row still offers Run now, and a second number for the second meaning is a
second thing to keep in step.

The honest limit: five probes close five holes. The suite will still be uniform along axes nobody
has thought of, and no number of specs fixes that nothing runs them automatically.

## Decisions by the owner

- 2026-11-24 — a probe that goes red is repaired in this task rather than deferred: the point of
  probing before the major is that there is still time to act on the finding. Each fix is its own
  commit, so what was found stays separable from what was changed.
- 2026-11-24 — five or six probes, not twenty: a pack written at random is the failure this task
  is correcting.
