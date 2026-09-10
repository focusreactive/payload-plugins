# Task contract — one workflow per document instead of one job per locale (#114)

**Risk: HIGH.** Changes what the jobs runner queues, what supersession cancels, and where the admin
panel reads per-locale state. Four callers, and it affects data an editor sees.

## The defect, measured

Parallel per-locale jobs on one document lose **the translations themselves**, not only their
publication as #114's title says. Measured on the plugin's real path — the `/translate/enqueue`
endpoint, the Payload jobs runner, and `payload.jobs.run` (the call the autorun cron makes):

| adapter | trial 1 | trial 2 | trial 3 |
|---|---|---|---|
| SQLite | 1 of 2 | 1 of 2 | 1 of 2 |
| Postgres | 1 of 2 | 1 of 2 | 1 of 2 |
| MongoDB | 1 of 2 | 1 of 2 | 1 of 2 |

Nine of nine: one translation of two lands, which one varies, no error raised, both jobs report
success.

**Cause.** Every write is a whole-document version snapshot, drafts included
(`payload/dist/collections/operations/utilities/update.js:188` reads the last published version as
its base and merges one locale onto it). Two jobs run that read-modify-write from the same base;
whoever writes second produces a snapshot that never contained the other's work.

**The parallelism is ours.** `AutoTranslate.policy.ts:138` emits one task per target locale, and
`runJobs` batches them through `Promise.all` unless `sequential` is passed — which the autorun cron
does not pass and `AutorunCronConfig` cannot express.

**Why the suite never caught it.** Every integration spec boots `createSyncRunner`, which runs
translations inline and in order. The jobs runner — the production default — had no coverage until
#126 added `bootTestPayload({ runner })`.

## Design decisions

**D1 — a Payload workflow with one task per locale.**
Verified by running it before choosing it: tasks execute strictly in sequence; the job's `log` array
records one entry per task with `taskSlug`, `input`, `output` and `state`; a failure stops the run and
leaves later locales unattempted; a retry resumes at the failed locale rather than redoing the
successful ones; and no migration is needed, because a job's `input` is a single JSON column and
`payload_jobs_log` already exists.

Rejected, with measurements, in #128: Payload's `enableConcurrencyControl` defers a blocked job to the
**next cron tick** — roughly a minute per locale at the plugin's `* * * * *` autorun — and adds an
indexed column to the jobs collection.

**D2 — the grouping happens inside `PayloadJobsTaskRunner`, not at its callers.**
`TaskRunner.enqueue(tasks: TaskInput[])` already receives one entry per locale, and the runner already
groups them by collection. Grouping by document and queueing one workflow is a change contained to
that class. Rejected: changing `TaskInput` to carry a locale array — it would touch both callers, the
sync runner, the lifecycle wrapper and the endpoint, for no gain, since the array already arrives.

**D3 — a re-enqueue supersedes every live job for the document, the one in flight included.**
The user's decision, taken twice. The first version spared a running workflow so it could keep its
already-translated locales; review showed that premise does not hold — Payload has no "queue behind",
its picker takes any job that is not currently processing, so the spared job and the new one write the
document at once on the next cron tick. That is the lost update at workflow granularity. Rejected on
the second pass: leaving the running job and dropping the new request, which loses no work but also
never translates the edit the user just asked for.

What a cancelled run actually costs: nothing that was translated, because those locales are already
written to the documents. Only the job's log and its unfinished locale go, and the new workflow
redoes that locale against the newer source — which is what the user asked for by re-enqueueing.

**D4 — the panel reads per-locale state from the job log.**
The user's decision. Payload writes an entry per task, so the detail survives the collapse from N jobs
to one. Rejected: one row per document — less work now, but the editor loses sight of which locale is
done and which failed, which is the information the panel exists to show.

**Placement:** the workflow registration goes beside the task registration in
`PayloadJobsRunnerProvider.configure()`; the grouping in `PayloadJobsTaskRunner.enqueue`; the log
reduction where `latestTaskPerTargetLocale` lives today.

**New surface:** none outside the plugin. The `/translate/enqueue` contract is unchanged — it already
accepts `target_lng` as a string or an array.

**Written contract owed:** yes — what the workflow guarantees about ordering and about partial
completion after a failure. Neither is expressible in a signature.

**Escalate:** no. One module, no new dependency, no schema change.

## Acceptance criteria

1. **Every requested locale is translated.** Enqueue two locales for one document through the endpoint
   with the jobs runner, run the queue, and both translations are present. *Check: integration test on
   SQLite.* Currently fails — one of two lands.
2. **The same holds on Postgres and MongoDB.** *Check: `test:integration:postgres` and `:mongo`.*
3. **Locales run in order, not concurrently.** *Check: integration test asserting the job log's entries
   are ordered and non-overlapping.*
4. **A failure stops the run and leaves later locales unattempted**, and the job records which locale
   failed. *Check: integration test with a provider that throws for one locale.*
5. **A retry resumes rather than restarting** — a locale already translated is not sent to the provider
   again. *Check: integration test using the boot's `translateCount()`.*
6. **A re-enqueue leaves exactly one live job on the document**, whatever state the old one was in —
   not started, queued for retry with every locale logged, or in flight. *Check: unit tests on the
   runner plus `job-extend.int.test.ts`.*
7. **The status endpoints still report per-locale state**, now from the job log. *Check: integration
   test through the real endpoints.*
8. **The sync runner is unaffected.** *Check: the existing 73 integration tests stay green on SQLite.*
9. **Checks clean:** check-types both packages, unit tests, lint at the repo baseline.

## Human choices

- **Supersede every live job for the document** (D3), after the first version's premise was
  disproved. Rejected alternative recorded above.
- **Panel reads the job log** (D4). Rejected alternative recorded above.
- **Fix this under #114** rather than opening a separate issue, with #114's description extended by a
  comment to cover the wider defect.

## Risks

- The panel's data source changes; a mistake there is visible to editors even though no translation is
  lost.
- Old jobs queued before the upgrade carry the per-locale shape. `readCollectionRef` is the precedent
  for reading two stored shapes and should be followed rather than reinvented.
- Workflows are a Payload concept the plugin has not used before. The behaviour above was verified on
  3.84.1; the plugin's peer floor is `^3.76.0` and that gap is unverified.

## Corrected while building

**`bootTestPayload` cannot boot twice in one file.** `getPayload` caches per process, so a second
`bootTestPayload` in the same spec returns the first — the failing-provider case silently ran against
the healthy boot and reported the wrong thing. Split into its own file, which is what the harness's
own docblock already warns about.

**The per-locale rows must keep the real job id.** The first version of `normalizeJobLocales`
synthesised `${jobId}:${locale}` for uniqueness. That id is handed straight to `cancel()`, which
addresses jobs — so supersession stopped cancelling anything. The rows share the job id, because they
are rows of one job.

**Completed jobs are deleted by default.** Payload's `deleteJobOnComplete` defaults to `true`, and
`bootTestPayload` inherited that — so the panel had nothing to read after a run. The harness now sets
it to `false`, matching the dev app and the README's own recommendation. Worth stating plainly: the
panel reading per-locale state from the job log only works for hosts that keep completed jobs.

**A retry is delayed by backoff.** Payload backs a failed job off exponentially, so a retry cannot be
observed by simply running the queue again; the spec clears `waitUntil` rather than waiting.


## Review log

**2026-09-04 — three review passes over the first implementation.** All findings were checked against
Payload 3.84.1's source before being acted on; four were real defects and are fixed here.

- **`reclaimStaleJobs` had gone dead.** It narrowed by `taskSlug`, and `jobs.queue({ workflow })`
  writes `workflowSlug` and leaves `taskSlug` null (`queues/localAPI.js:51-54`), so after this change
  no job matched it. Boot-time stale-lock recovery would have reported zero reclaimed, forever,
  without erroring. Both slug predicates now come from one `ownJobs()`.
- **`run()` read a locale row instead of the job.** `handleTaskError.js:43` stamps `completedAt` on a
  *failed* log entry too, so a partially-failed workflow presented rows that all carried one, and the
  Retry button answered `already_completed` → 404 for exactly the jobs a user presses it on. The
  runner's internal reads now go through `findRawJobs` + `normalizeJob`; only `findByCollection`,
  which feeds the panels, expands to locale rows.
- **The supersession predicate reopened #114.** It filtered on an expanded row's `status`, and a job
  whose locales are all logged has no `pending` row — yet a non-final task failure leaves it queued
  (`hasError: false`, `processing: false`). Two live jobs on one document, picked into one
  `Promise.all` batch. See D3 above for how this was settled.
- **N reads of the job table.** The lookup sat inside the per-document loop while `findRawJobs` is
  unpaginated and filters in memory, so `select_all` meant one full scan per document. One read now
  serves the whole batch, and the orphaned `groupByCollection` is gone.

**Test findings, and what closed them.** The audit's central result was that D4 was not tested at all:
`normalizeJobLocales` could have its entire `job.log` branch deleted and the suite stayed green — in
production that is the panel reporting "completed" for a locale that failed. Seven unit cases now
cover it, and the audit's own empty implementation was pasted in to confirm four of them go red.
Three more gaps closed: the sequencing check asserted order, which survives `Promise.all`, and now
asserts non-overlap (`executedAt` of each locale against the previous locale's `completedAt`) —
verified by mutating the handler to `Promise.all`, which reddens it; the failure spec failed the
*last* locale, so "stops there" was unobservable, and now runs three locales failing the middle one;
and "does not re-run a completed workflow" passed equally for a job left failed, so it now asserts the
workflow reached `completedAt` first. A third locale (`es`) was added to the shared harness for this.

**Comment audit.** 110 comment lines over 569 lines of code, judged too dense. The #114 lost-update
story had been written out in five places; `PayloadJobsTaskRunner.enqueue` now owns it and the others
point at it or are gone. Twenty-two comments deleted or shortened, mostly narration of the line below.
What was kept is measured Payload behaviour a reader cannot recover without opening `node_modules`:
`completedAt` on failed log entries, the locale-as-task-id restoration, the retry backoff, the
`getPayload` per-process cache.

**Verification.** Unit 1332 in the plugin; integration 15/15 on SQLite and MongoDB, 13/15 on Postgres
— the two failing files are the known #124 auto-translate cases, red on `main` as well. check-types
clean in both packages; lint at the repo baseline.

**Left open, deliberately.** `enqueue` cancels the old job and queues the new one without a
transaction, so a batch spanning several documents can leave one document's old job deleted and its
new workflow unqueued if a later document throws. _Closed by
[2026-09-08-one-live-job-per-document](./2026-09-08-one-live-job-per-document.task.md): `enqueue` no
longer cancels or deletes anything._
