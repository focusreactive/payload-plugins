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

**D3 — supersession cancels only jobs that have not started.**
The user's decision. A workflow already running keeps its already-translated locales and finishes;
the new request queues behind it. Rejected: cancelling the whole workflow, which is closer to today's
semantics but discards locales that were already translated in the current run — the very work this
change exists to stop losing.

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
6. **Supersession cancels only jobs that have not started.** *Check: unit test on the runner.*
7. **The status endpoints still report per-locale state**, now from the job log. *Check: integration
   test through the real endpoints.*
8. **The sync runner is unaffected.** *Check: the existing 73 integration tests stay green on SQLite.*
9. **Checks clean:** check-types both packages, unit tests, lint at the repo baseline.

## Human choices

- **Supersede only not-yet-started jobs** (D3). Rejected alternative recorded above.
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

_(appended by review runs)_
