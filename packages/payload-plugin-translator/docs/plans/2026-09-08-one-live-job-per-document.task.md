# Task contract — one live job per document, extended rather than replaced

Continues [2026-09-04-locale-workflow.task.md](./2026-09-04-locale-workflow.task.md), which made a
document's locales one workflow job. That change left the *second request* case wrong: a new request
replaced the live job outright and dropped whatever locales it still owed.

**Risk: HIGH.** Changes what `enqueue` writes, removes supersession entirely, touches a security
defect in the cancel path, and adds a second execution mode. Data an editor sees is affected.

## Stage 1 — extend the live job instead of replacing it

**The defect.** `enqueue` cancelled every live job for the document and queued a replacement carrying
only the locales of the current request. The panel's per-row "re-translate" button sends exactly one
locale, so a live job holding `['de','fr','es']` became `['fr']` and two locales vanished with no
trace. Introduced by the supersession rule added on 2026-09-04.

**D1 — a locale is added to the live job's stored list; no cancel, no delete.**
Measured before choosing (see *Evidence*): a locale written into a running job's row IS picked up by
its handler, on all three adapters. So "queue behind" needs no new store — `target_lngs` already is
the queue. Rejected: keep replacing and carry over the unfinished locales. It works, but it cancels a
running job, and cancellation was measured not to stop one (see D3 of the earlier contract, now
superseded) — the row is deleted before the handler can read the flag.

**D2 — the write is narrow: the `input` column only, through the database adapter.**
Measured: `payload.update` is the full document operation — it re-reads, merges and writes the row
whole, reverting log entries pushed in between. Observed at 3/120 on Postgres and 1/120 on MongoDB.
A narrow write showed 0 clobbering across ~1000 rounds on all three adapters. The jobs collection's
only `beforeChange` hook guards a *cancelled* job from being revived; we never append to a cancelled
job, so skipping hooks costs nothing.

**D3 — the choice lives in one pure function, `planEnqueue`.**
Three situations (no live job · add to it · give it a job of its own) and, from stage 3, one more
input (is the queue exclusive). Keeping it inline would put the mode check in the middle of an
I/O-heavy method. Rejected: a strategy object per mode — the two modes differ in exactly one branch,
so an interface plus two implementations costs more than the branch.

**D4 — after writing, verify.**
The residual loss is the read-modify-write gap: the job can complete between our read and our write,
leaving the locale in the list with nobody to run it. Measured at 0–5% of appends landing mid-run.
Detectable: re-read after writing; if the job has completed, or the locale is not in the stored list,
give those locales a job of their own. That fallback fires only when the old job is already finished,
so it never creates two live jobs.

## Stage 2 — defects found by the review passes

1. **The panel crashes** when a locale failed and the job carries no final error yet: the client reads
   `run.error.message` unconditionally for `status: "failed"`. Introduced on 2026-09-04, when a row's
   status started coming from the job log while its error still came from the job.
2. **`/translate/cancel` deletes any row in `payload-jobs`.** Ids come from the request body and the
   delete is not narrowed to this plugin's jobs; the default access guard allows everyone. `ownJobs()`
   already exists and is simply not applied there.
3. **`cancel-by-collection` skips jobs waiting to retry** — the same expanded-row `status === "pending"`
   predicate that was already fixed in `enqueue`.
4. **`run()` claims success without running anything.** Payload returns `noJobsRemaining` /
   `remainingJobsFromQueried: 0` when the picker takes nothing; we ignore it.

## Stage 3 — honour the host's `enableConcurrencyControl`

**D5 — we never set the flag; we adapt to it.**
The user's decision. Enabling it adds an indexed column to `payload-jobs` and needs a migration on SQL
— that is the host's call, not a plugin's. Rejected: a plugin option that sets it, and setting it
unconditionally; both make the plugin responsible for someone else's schema.

**D6 — no plugin option, no config field.** The fact is readable at the point of use
(`payload.config.jobs.enableConcurrencyControl`). Adding an option would be a second source of truth
for something Payload already stores, and Payload refuses to boot if `concurrency` is declared while
the flag is off — so the two can never legitimately disagree.

With the flag on, the workflow declares `concurrency: { key: <collection>:<id>, exclusive: true }` and
`planEnqueue` stops appending to a *running* job: the new job is queued alongside and Payload holds it
until the running one finishes.

## Evidence gathered before designing

Probes run on SQLite, Postgres and MongoDB, ~1000 rounds total.

| Question | Answer |
|---|---|
| Does a running handler see a locale appended to its row? | Yes, on all three adapters (28/28 with a barrier) |
| Is the probe able to fail? | Yes — reverting the handler's loop to a one-time read reddens it |
| Does `payload.update` clobber the job log? | Yes: 3/120 Postgres, 1/120 MongoDB |
| Does a narrow write clobber it? | No: 0 across all adapters |
| Residual loss with a narrow write | 0–5% of appends landing mid-run; always "write landed, handler never ran it", never "write vanished" |
| Does the handler reading the row itself help? | No measurable difference — dropped |

## Acceptance criteria

1. **A second request adds its locales instead of replacing the job.** Enqueue `['de','fr']`, then
   enqueue `['es']` for the same document before the queue runs; one job exists carrying all three.
   *Check: integration test on SQLite.* Fails now — today the second request replaces the first.
2. **Nothing a live job still owes is dropped.** After the sequence in (1), running the queue
   translates all three locales. *Check: same test.* Fails now.
3. **A locale appended to a job already running is picked up.** *Check: integration test with a
   barrier holding one locale.* Fails now — no append path exists.
4. **The job log survives an append.** *Check: the same test asserts the entry written before the
   append is still present.*
5. **A locale that cannot be delivered gets a job of its own.** *Check: unit test on the runner —
   the stored row reports completed after the write.*
6. **`planEnqueue` returns the right plan for each situation**, in both modes. *Check: unit tests.*
7. **The panel no longer crashes on a failed locale with no job error.** *Check: unit test on
   `buildTranslationStatusRows`.* Fails now.
8. **Cancel only ever deletes this plugin's jobs.** *Check: unit test asserting the delete's `where`
   carries the own-jobs predicate.* Fails now.
9. **`cancel-by-collection` cancels a job waiting to retry.** *Check: unit test.* Fails now.
10. **`run()` reports failure when the picker took nothing.** *Check: unit test.* Fails now.
11. **With the host's flag on, two jobs for one document never run at once, and none is lost.**
    *Check: integration test booted with `enableConcurrencyControl`.*
12. **With the flag on, jobs for different documents still run in parallel.** *Check: same file.*
13. **The workflow declares `concurrency` only when the flag is on.** *Check: unit test on the
    provider — Payload refuses to boot otherwise.*
14. **The existing integration suite passes in both modes**, on all three adapters.
15. **Checks clean:** unit tests, check-types in both packages, lint at the repo baseline.

## Human choices

- **Extend the live job rather than replace it** (D1), after being shown that a replacement drops the
  locales the old job still owed.
- **Never set `enableConcurrencyControl` ourselves** (D5). Stated as: requiring the host to flip a flag
  to fix our bug would be offloading the bug onto them, and flipping it silently is worse.
- **One gate, not two implementations** (D3) — the user asked explicitly not to smear two modes across
  the code.
- **Test the second mode too**, including the whole suite under the flag, not just a targeted test.
- **The row/job type split is out of scope** and stays a follow-up.

## Risks

- The append path rests on Payload refreshing `job.input` from the row after each task — an
  implementation detail, not a documented contract, measured on 3.84.1 against a peer floor of
  `^3.76.0`. Criterion 3's test is what turns a future change into a red run instead of silent loss.
- Removing supersession means a document can briefly hold a finished job and a new one. Nothing reads
  "the" job for a document, so no caller breaks, but it changes what the panel lists.
- Enabling the host's flag adds one query per queue run for every job in the host's app, not just ours.

## Review log

**2026-09-08 — three review passes, all findings checked against the code before acting.**

**Design review.** Three real defects, all fixed here.
- *The auto-translate debounce had stopped coalescing.* The common case is the same locales on every
  save, which leaves nothing to append — so `enqueue` did nothing at all and the pending job kept the
  first edit's `waitUntil`. The plan now names the host job even when it has nothing to add, and the
  debounce moves with the request.
- *A request's settings were silently discarded.* A job carries one source locale, one strategy and
  one publish flag for all of its locales; a request that chose differently would have run under the
  job's. `pickHost` now requires all three to match, and `enqueue` groups by them, which makes
  `queueWorkflow` taking them from the first task true by construction rather than by luck.
- *Two concurrent appends lost one, undetectably.* The verify step only asked about its own locales,
  so a competing write that replaced the whole list looked like success. The write now retries once
  from the stored row — a set union, so retrying is harmless — and anything still missing gets a job
  of its own.

Also: documents are served in parallel again (the loop had made a `select_all` enqueue N sequential
round trips), `findRawJobs` reads at `depth: 0` so the legacy relationship field is not populated,
and `workflowName` was removed from the public options and derived from `taskName` — nobody asked to
set it, and keeping it out means no new public surface and no `@since` to date.

Corrected while doing this: `ultracite fix` had rewritten two constructors away from the parameter
properties every sibling handler uses, and dropped a `private` in the process. Reverted.

**Test audit (mutation-based).** 13 mutations, **7 survived** the first suite. The worst: deleting
the per-document filter on the live jobs handed to `planEnqueue` kept all 127 unit tests green — under
it, enqueuing for one document appends to another document's job. Also surviving: ignoring
`exclusiveQueue`; taking the last live job instead of the newest; dropping the debounce carry;
blanking the other stored fields on append; and the plugin switching the host's
`enableConcurrencyControl` on for them. Each now has a check, and each mutation was re-run to confirm
it dies.

One integration check was self-satisfying: `exclusive-queue` asserted the picker took nothing, which
is equally true when there was nothing to take. It now first requires the second job to exist and to
carry exactly the requested locale.

**Comment audit.** 215 comment lines over 1313 of code, judged too dense; now 164 over ~1570. One
comment was outright false — "groups are disjoint by document" stopped being true once the grouping
key gained the settings — and several pointed at code the diff had moved or renamed. The recurring
fault was one rationale written out in up to eight places; each now has a single owner and the rest
point at it or are gone. What was kept is measured Payload behaviour a reader cannot recover without
opening `node_modules`.

**Verification.** Unit 1359 in the plugin; check-types clean in both packages; lint 8 warnings on the
changed files against 10 on `main` for the same files, 0 errors. Integration on three adapters in both
queue modes — six runs: SQLite 82/82 and MongoDB 82/82 in each, Postgres 79/82 in each, the three
failures being the known #124 auto-translate cases that are red on `main` as well.

**Left open.** The row/job type split (several panel rows share one job id, so per-row Cancel acts on
the whole document) stays a follow-up — it changes the `TaskRunner` contract, both runners, five
handlers and the client.

