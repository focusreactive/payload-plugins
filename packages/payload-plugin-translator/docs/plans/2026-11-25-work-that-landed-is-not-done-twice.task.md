# Work that landed is not done twice

## Requirements / Task restatement

A translation that succeeded is translated again, up to three more times, and each repeat is paid
for at the provider.

The cause is outside this package and cannot be repaired here. A host that registers a jobs hook
makes Payload validate its own job rows. The entry Payload writes when a step succeeds omits a
field its own schema requires, so the write is refused. That refusal arrives *after* the
translation, and the plugin rethrows it, which makes the queue retry the whole thing. The queue
remembers finished steps in the very log it could not write, so nothing is remembered and every
retry runs the step again.

Measured in the sandbox for one locale: queued at 11:39:39, attempted at 11:40, 11:41, 11:42 and
11:43; the text was in the document from the first attempt; the run record closed only on the
fourth. The job row ended with four tries and an empty log.

- R1 (in) A translation whose text landed is paid for once.
- R2 (in) Its locale is recorded as delivered when the work is done, not when the queue gives up.
- R3 (in) A translation that genuinely failed keeps today's behaviour exactly: the configured
  retries, then an ending of `failed` carrying the plugin's own error.
- R4 (out) The external cause. Neither Payload's schema nor the host plugin's flag is touched.
- R5 (out) The waiting itself. A queue that picks work up once a minute is the host's setting.

## What this starts from (measured)

- The workflow handler rethrows every error from a locale's task
  (`PayloadJobsRunnerProvider.ts`, the catch inside `walkTheRunsLocales`), and reports an ending
  only when `owedIfGaveUp` says the retries are exhausted.
- The plugin already knows which of the two failures it is holding: a map filled only by its own
  task handler. No entry means the handler returned, which means the text was written.
- **A workflow that returns normally does not retry, and its completion does not touch the log.**
  `node_modules/payload/dist/queues/operations/runJobs/runJob/index.js:45-56` writes only
  `completedAt`, `processing` and `totalTried`, with a comment saying the log is deliberately left
  alone. So the write that was failing is not on this path: swallowing the error ends the job.
- The map is keyed by the **job**, not by the locale
  (`PayloadJobsRunnerProvider.ts`, `thrown.set(args.job, error)`), and is filled only when the
  plugin's own handler throws.
- A red case already stands in `the-bookkeeping-fails-after-the-work.int.test.ts`: the provider is
  called three times where one is owed.
- When a translation genuinely fails, the locales the run never reached are recorded `abandoned`
  and the run stops — `gave-up-mid-run.int.test.ts`. That is deliberate and stays.

## Decisions

### D1. A failure that arrives after the work is not rethrown

- **Chosen:** when the plugin's own task did not throw, the locale is recorded delivered and the
  loop carries on. The error is not rethrown, so the workflow returns normally and the queue
  completes the job instead of retrying it.
- **Why it bites:** the retry cannot help — the queue refuses the same row every time — and each
  one costs a translation. Returning normally is the only path Payload offers that both ends the
  job and avoids the write that fails.
- **Rejected — keep rethrowing and lower the retry budget to one:** still pays twice, and the
  budget belongs to real failures, which need it.
- **Rejected — cancel the job from inside the handler:** more machinery than returning, and it
  would leave the job cancelled rather than done, which is not what happened.
- **Constraint cited:** R1 and R3 — the two failures are told apart by the map, and only the one
  that already did its work is swallowed.

### D2. The plugin's own handler says what became of it, in three answers, per locale

- **Chosen:** the handler leaves a mark for itself — `translated` when it returns, `failed` when it
  throws — and the absence of a mark is the third answer: it never ran. The catch acts on the
  answer, never on the shape of the error it caught. The mark is kept per job **and** per locale.
- **Why it bites:** asking only "did it throw" reads two different situations as one. A failure
  raised before the handler is reached — the queue cannot resolve a task handler
  (`getRunTaskFunction.js:52`), or a host's own `shouldRestore` throws (`:35`) — leaves no throw of
  ours and no text written, and would be answered `delivered`. That is worse than the defect being
  fixed: a locale reported as translated that nothing touched.
- **Why not read the error:** today the two arrive differently — the plugin's own throw comes back
  wrapped by the queue, the refused log write comes back raw — so they *are* separable by type.
  That separation is the queue's internal wrapping, not a contract, and a minor version may change
  it silently. What the plugin knows for certain is how far its own code got.
- **Why per locale:** a mark that records success outlives the locale that set it. One mark per job
  would let a locale whose task never ran read the previous locale's success.
- **Rejected — re-read the document to see whether the text is there:** it cannot tell text written
  by this run from text written by an earlier one, and costs a read on every failure.
- **Rejected — a wrapper that returns an outcome instead of throwing:** the same information in a
  different shape; the mark is what makes the answer trustworthy, not where it is read.

### D3. The ending for work that landed stays `delivered`

- **Chosen:** unchanged. Only its timing moves — from the last attempt to the first.
- **Rejected — a new ending naming the bookkeeping failure:** the host asked whether the locale was
  translated, and it was.

**New surface:** one internal value with three cases, read in one place and written in one.
**Written contract owed:** none — the three cases are named where they are set.
**Written contract owed:** none.
**Escalate:** no — the shape was measured against Payload's own completion path before deciding.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R1 | A translation whose bookkeeping then fails calls the provider exactly once | the integration spec's provider counter | **fails now** — three calls |
| AC2 | R2 | Its locale is recorded delivered after the first pass of the queue, not after the last | same spec, reading the record after one drain | **fails now** — it closes on the fourth |
| AC3 | R1 | The job row ends completed rather than exhausted, so nothing is queued to run again | same spec, reading `payload-jobs` | **fails now** — four tries, an error, never completed |
| AC4 | R3 | A translation that genuinely fails still retries to the configured limit and ends `failed` carrying the plugin's own error | `gave-up-mid-run.int.test.ts` and `final-failure.int.test.ts`, unchanged | **passes now** — stays-true, and the direction this change is most likely to break |
| AC5 | R1, R2 | With two locales, a bookkeeping failure on the first does not stop the second, and each is translated once | a new case in the same spec | **fails now** — the first throw ends the run |
| AC6 | R1, R3 | In one run, a locale whose bookkeeping failed is recorded delivered and a later locale whose translation really failed is not recorded delivered | a new case over both endings | **fails now** — the first failure of either kind ends the run |
| AC9 | R2 | A failure raised before the plugin's own handler runs is passed on untouched, and the locale is not recorded delivered | a unit case over the registered task and the workflow handler | **fails now** — no mark and a finished translation are the same answer |
| AC7 | R3 | Retrying after a final failure still delivers | `retry-after-a-final-failure.int.test.ts`, unchanged | **passes now** — stays-true |
| AC8 | — | The baselines hold | package suite ≥ 3052 passed / 16 skipped · integration ≥ 320 passed / 7 skipped, 0 failed · `check-types` 10/10 · `oxlint .` ≤ 26 warnings, 0 errors · build exits 0 | **passes now** — measured |

AC4 is the one this change is most likely to break: both endings are decided in the same catch, and
a condition the wrong way round would stop retrying the failures that deserve a retry.

## Risk

**High.** Every translation goes through this handler, and the change decides whether the queue
retries at all. Getting it backwards in one direction pays four times for nothing, which is today's
defect; in the other it abandons a translation that a retry would have rescued.

The judgement the change rests on is the same one already in place and already measured: a task
handler that returned means the text was written, because the write happens inside that handler and
nothing between the write and the return can swallow a throw.

The external behaviour being relied on is Payload's own: a workflow handler that returns normally
completes its job without touching the log. That is read from the installed version and pinned by
the criterion that the job row ends completed.

Rollback is a revert; nothing is stored differently.

## Decisions by the owner

- 2026-11-25 — the repeated payment matters more than the delay: a translation waiting two extra
  minutes costs patience, a translation bought four times costs money.
- 2026-11-25 — the host is told once per run, in the log, that the queue's own record of the
  work could not be written. A job row that reads as completed with an empty log is otherwise
  a puzzle for whoever opens the table.
- 2026-11-25 — which of the three happened is read from a mark the plugin's own handler leaves,
  never from the shape of the error caught: the queue's error wrapping is its own business and
  may change, while how far this plugin's code got is something it knows.
- 2026-11-25 — the external cause is not repaired here. The plugin stops paying for it; Payload and
  the host's scheduling plugin are left alone.
