# Research: run identity across the translation lifecycle (#107, #110, #106, #103)

Date: 2026-10-05. Read against **0.14.0** (`package.json:3`), with #168 (0.15.0) merged to `main`.

## Input

Four issues filed 2026-08-28 by one external consumer building an editorial workflow on top of the
plugin, plus one adjacent issue considered for inclusion:

| Issue | Ask |
|---|---|
| #107 | `enqueue` should return the job ids it created |
| #110 | Pass run context into lifecycle callbacks |
| #106 | An `onCancelled` lifecycle callback |
| #103 | `get-collection-status` should return document id and target locale, not just job id |
| #123 | Status endpoints still load a collection's whole job history (considered, see *Size check*) |

## Parsing summary

- Source type: four GitHub issues, each written as a problem statement plus a suggested shape.
- Stakeholder: a single consumer. All four describe one workflow and cite each other (#107 cites #110
  and #108; #110 cites the constraint #107 forces).
- Explicit request: give a host a durable way to connect its own editorial record to one translation
  run, from enqueue through completion or cancellation.
- Implicit expectation: that a "job" corresponds to one document × one target locale. **This is the
  load-bearing assumption and it is no longer true** — see *Codebase map*.
- Constraint stated by the consumer: they currently enforce "one open run per document × target
  locale" as a workaround, and must run with `retries: { attempts: 0 }`.
- Contradiction found: #106 describes two cancellation paths; one of them no longer exists.

## Codebase map

### Prior art

- `docs/plans/2026-09-04-locale-workflow.task.md` — replaced per-locale jobs with one workflow per
  document. Landed `3ecc2c89` (2026-09-04).
- `docs/plans/2026-09-08-one-live-job-per-document.task.md` — **removed supersession entirely**; D1:
  "a locale is added to the live job's stored list; no cancel, no delete". Landed `69274e01`
  (2026-09-08).
- `docs/plans/2026-09-04-job-scan-bounds.task.md` — `TaskFilter`, and D4's reasoning that `TaskRunner`
  is reachable through the exported `TaskRunnerProvider.create()` and therefore cannot be changed
  freely.
- `docs/plans/2026-09-04-job-history-pruning.task.md` — retention is the host's policy, not the
  plugin's; nothing about the job table is exported.
- Epic #52 — "Grouping translation variants into editorial sets … belongs in the consuming app and
  would build on the per-locale status + staleness primitives rather than in the plugin." The four
  issues are consistent with that: they ask for better primitives, not for the workflow itself.

No prior plan covers run identity. No previous attempt in `git log`.

### Relevant files

**Runner contracts**
- `src/server/modules/task-runner/TaskRunner.interface.ts` — `enqueue(tasks, scope?): Promise<void>`
  (`:22`); `cancel(taskIds)` (`:27`); `findByCollection` overloads (`:39-44`); `TaskFilter` (`:53-61`).
  The docblock at `:8-13` still claims cancellation-before-enqueue is encapsulated here; that comment
  is stale.
- `src/server/modules/task-runner/types.ts` — `TaskInput` (`:22-36`), `Task` (`:41-50`),
  `TaskStatus` (`:17`).
- `src/server/modules/task-runner/TaskRunnerProvider.interface.ts` — `TaskHandlerInput` (`:10-17`),
  `TaskHandler` (`:22-26`), `TaskRunnerProvider` (`:56-75`).

**Payload Jobs runner**
- `payload-jobs-runner/PayloadJobsTaskRunner.ts` — `enqueue` (`:51-77`), `serve` (`:79-99`),
  `extendJob` (`:101-135`), `queueWorkflow` (`:137-162`), `cancel` (`:164-176`), `run` (`:178-202`),
  `ownJobs` (`:266-273`).
- `payload-jobs-runner/planEnqueue.ts` — `planEnqueue` (`:33-54`), `pickHost` (`:60-73`).
- `payload-jobs-runner/types.ts` — `StoredWorkflowInput` (`:77-91`), `PayloadJob` (`:46-74`).
- `payload-jobs-runner/normalizeJob.ts` — `normalizeJob` (`:34-54`), `normalizeJobLocales` (`:60-80`).
- `payload-jobs-runner/PayloadJobsRunnerProvider.ts` — retry defaults (`:28-41`), task registration
  (`:148-162`), workflow registration (`:183`).

**Sync runner**
- `sync-runner/SyncTaskRunner.ts` — in-memory ids (`:29`), inline execution (`:47-68`), `cancel`
  no-op (`:72-74`).
- `sync-runner/SyncRunnerProvider.ts` — `configure` is identity (`:38-40`).

**Lifecycle**
- `src/server/modules/lifecycle/types.ts` — `TranslationTask` (`:9-20`),
  `TranslationLifecycleCallbacks` (`:34-46`), per-attempt semantics (`:22-33`).
- `src/server/modules/lifecycle/LifecycleNotifier.ts` — `queued` (`:21-24`), `completed` (`:26-29`),
  `failed` (`:31-44`), `safe` (`:46-53`).
- `src/server/modules/lifecycle/withQueuedNotification.ts` — the only decorator (`:12-27`).
- `src/server/modules/lifecycle/taskMapping.ts` — `taskFromInput` (`:6-12`),
  `taskFromHandlerInput` (`:15-21`).
- `src/server/features/translate-document/wireTranslateRunner.ts` — the only assembly point
  (`:84-90`), `failed` (`:76`), `completed` (`:79`).

**Endpoints**
- `src/server/features/enqueue-translation/handler.ts` — response at `:98`.
- `src/server/features/get-collection-status/handler.ts` — mapping at `:39-43`.
- `src/server/features/get-document-status/handler.ts` — mapping at `:42`; `model.ts:74-81`,
  `:86-104`.
- `src/server/features/cancel/handler.ts` — `:14-25`; route is **DELETE** (`route.ts:20-23`).
- `src/server/features/cancel-by-collection/handler.ts` — `:17-42`.

### Findings that contradict the issues

1. **Supersession does not exist.** `PayloadJobsTaskRunner.enqueue` never cancels or deletes;
   `planEnqueue` picks a live job to extend and `extendJob` unions target locales into its `input`
   column. A regression test is named for it: *"never cancels or deletes a job when enqueuing"*
   (`payload-jobs-runner/__tests__/PayloadJobsTaskRunner.test.ts:234-246`). **#106's second path is
   gone.** Even the removed version superseded per *document* and only for `pending` jobs — narrower
   than #106's "per (document, target locale)" wording.

2. **A job is not a (document, locale) pair.** One row covers (document, source locale, strategy,
   publish flag, requester) and holds a **list** of target locales (`StoredWorkflowInput.target_lngs`,
   `payload-jobs-runner/types.ts:77-91`). `normalizeJobLocales` spreads one `base` — including its
   `id` — across every target (`normalizeJob.ts:67-78`). **#107's suggested
   `{ fr: id, de: id, it: id }` would repeat one id three times**, and breaks outright for a
   `select_all` enqueue spanning many documents.

3. **The cancel route is `DELETE`, not `POST`** (`cancel/route.ts:20-23`), and its handler holds
   **only job ids** (`cancel/handler.ts:14-25`) — no document, no locale, no requester. The row is
   hard-deleted (`PayloadJobsTaskRunner.ts:172-175`). `cancel-by-collection` *does* hold `Task[]`
   with documents and locales (`:30`) and discards them at the `cancel(ids)` boundary (`:39`).

4. **The job id already exists at enqueue and is thrown away.** Payload's `jobs.queue` returns the
   created `Job`; the plugin's local type alias declares the call `Promise<unknown>`
   (`PayloadJobsTaskRunner.ts:17-23`) and `queueWorkflow` discards it (`:155`).

5. **There is no opaque channel into `enqueue`.** `TaskInput` has no free-form field
   (`types.ts:22-36`). The second parameter is `RequestScope` — a closed shape of `transactionID` +
   branded `Requester` (`RequestScope.shapes.ts:9-12`) — and the requester **is part of job identity**:
   `pickHost` refuses to host a request from a different requester (`planEnqueue.ts:68-69`), so it
   cannot be repurposed without changing which jobs merge.

6. **Payload's own opaque field is unavailable.** `jobs.queue({ meta })` exists, but the `meta` column
   is only added when the host sets `jobs.stats`
   (`node_modules/payload/dist/queues/config/collection.js:266-272`). The plugin neither sets it nor
   may — the host owns that schema, per `2026-09-04-job-history-pruning.task.md` D1.

7. **Retries are on by default: 3 attempts, exponential backoff**
   (`PayloadJobsRunnerProvider.ts:28-41`, README:372). The attempt number is never read — the task
   handler receives only `{ req, input }` (`:149-162`) and never sees the job row's `totalTried`.
   **#110's retry claim holds**, and a host that configured nothing gets three `onFailed` calls.

8. **`withQueuedNotification` is applied only when `onQueued` is present**
   (`wireTranslateRunner.ts:87`: `if (!lifecycle.onQueued) return taskRunner;`). A host that supplies
   only `onCompleted` gets no decoration at all. Anything delivered through that wrapper would not
   reach such a host.

9. **`TaskRunner` is the hidden implemented contract.** It is *not* exported from `src/index.ts`
   (verified against the full 58-symbol export list), yet a third-party `TaskRunnerProvider.create`
   must structurally return one (`TaskRunnerProvider.interface.ts:67`). Changing `enqueue`'s return
   type is therefore breaking for an implementor who cannot even name the type they must satisfy —
   the same gap the `RequestScope` export note describes (`src/index.ts:60-66`).

10. **Both response shapes are pinned by exact-match tests.**
    `enqueue-translation/__tests__/handler.test.ts:159` asserts
    `toEqual({ success: true, queued: 2 })`; `get-collection-status/handler.test.ts:136-140` asserts
    `toEqual([{id,status},…])`. Adding a field fails both. (`get-document-status` uses
    `toMatchObject`, so it is additive-safe.)

11. **The ordering rationale is untested end to end.** The only ordering test pins `queued` before
    `runner.enqueue` (`withQueuedNotification.test.ts:41-59`), not `queued` before `completed`. No
    test anywhere registers `onQueued` and `onCompleted` together, and the sync-runner suites contain
    no lifecycle references — so the exact scenario the docblock cites as the reason for the ordering
    has no coverage.

12. **The append path is the sharpest constraint on any run id.** `extendJob` unions a new request's
    locales into an existing job's `input`. One row can therefore carry locale `fr` from run 1 and
    locale `de` from run 2. **A single run id per job row cannot serve both.** Any run identity that
    must survive to `onCompleted` has to be recorded *per target locale*, not per job.

## Size check

**The four issues are one task, and #123 is not part of it.**

#107, #110, #106 and #103 are four symptoms of one absence: a translation run has no identity that
outlives the call that started it. They share `TaskRunner`, the lifecycle module and two handlers.

#123 is a query-shape problem in the same two status handlers. It shares files with #103 but nothing
else — no concept, no contract. Including it would mix a contract change with a performance change in
one review. **Recommendation: leave #123 out, and sequence it immediately after**, so
`get-collection-status` is opened twice deliberately rather than by accident.

## Problem statement

A host that layers its own editorial process on top of the plugin cannot connect its records to the
plugin's work. When it asks for a translation it gets back only a count; when the plugin calls back it
gets only `(collection, id, targetLng, strategy)`; when a run is cancelled it is told nothing; and the
collection-wide status list identifies rows by job id alone. The host is forced to join on
`(collection, document, locale)` plus "is a run open", which obliges it to forbid concurrent runs on
the same pair and to disable retries so each run produces exactly one callback. The underlying gap is
that **a run has no name**: nothing the plugin hands out identifies the enqueue that caused the work,
and the one identifier that does exist internally — the job row id — is both discarded at creation and
too coarse, because a job row covers many locales and can be extended by a later, unrelated run.

## Proposed scope

**In scope**

1. A run identity minted or surfaced by the plugin, carried from enqueue through `onQueued`,
   `onCompleted` and `onFailed` for the locale it belongs to.
2. Returning that identity from the enqueue endpoint, keyed so it is unambiguous for a multi-locale
   and multi-document request.
3. A cancellation signal to the host, for the one path that still exists (explicit cancel).
4. `get-collection-status` carrying document id and target locale.
5. Whatever `TaskRunner` / `TaskRunnerProvider` contract change the above requires, with an explicit
   decision on third-party implementors.

**Out of scope**

- #123 (query bounds on the status endpoints) — sequenced after, see *Size check*.
- An `onCancelled` for a supersede path: that path does not exist (finding 1).
- Attempt numbering in callbacks: raised by #110, but it is a separable addition to
  `TranslationTask`; include only if the design makes it free.
- Any change to what the plugin stores in the host's `payload-jobs` schema beyond the `input` JSON
  column the plugin already owns.
- Building the consumer's editorial workflow — out of scope per epic #52.

**Non-functional scan**

- **Performance** — relevant. `get-collection-status` already loads a collection's whole job history
  unfiltered (`handler.ts:35`). This task must not make that worse; #123 fixes it separately.
- **Security / access control** — relevant. The cancel handler takes ids from the request body and
  currently reads no identity; adding a cancellation callback must not leak which jobs exist. Both
  status handlers already filter by `visibleIds`.
- **Accessibility** — N/A. No admin UI change is required by any of the four.
- **i18n / localization** — N/A for the plugin's own surface; the data is locale-keyed but no
  user-facing strings are added.
- **Observability** — relevant. `LifecycleNotifier.failed` logs when `onFailed` is absent
  (`LifecycleNotifier.ts:34-40`); a new callback should follow the same rule or deliberately not.

## Acceptance criteria (draft)

1. **Given** an enqueue for one document and three target locales, **when** the host reads the
   response, **then** it can tell, per target locale, which run was created — with no ambiguity when
   one job row serves all three. *Check: integration test on all three adapters.*
2. **Given** a run identified in (1), **when** `onQueued`, `onCompleted` or `onFailed` fires for one of
   those locales, **then** the callback carries the same identity as the response gave for that
   locale. *Check: integration test with a real enqueue and a real handler run.*
3. **Given** a live job for document D holding locale `fr` from run 1, **when** a second enqueue adds
   locale `de`, **then** the callback for `fr` still carries run 1's identity and the callback for
   `de` carries run 2's. *Check: integration test exercising `extendJob`. This is finding 12 and is
   the case most likely to be got wrong.*
4. **Given** the default retry configuration (3 attempts), **when** a task fails twice then succeeds,
   **then** the host can distinguish the three callbacks from one another. *Check: unit test on the
   handler path. Drop this criterion if attempt numbering is ruled out of scope.*
5. **Given** an explicit cancel of a job, **when** the host has registered a cancellation callback,
   **then** it is told which document and target locale stopped, and the callback fires before the
   row is deleted. *Check: unit test asserting call order against the delete.*
6. **Given** a cancel for an id that does not exist or is not this plugin's job, **then** no
   cancellation callback fires and no error surfaces to the caller. *Check: unit test — negative
   path; `ownJobs()` already narrows the delete (`PayloadJobsTaskRunner.ts:172-175`).*
7. **Given** a collection with jobs for several documents and locales, **when**
   `get-collection-status` is called, **then** each row names its document and its target locale.
   *Check: unit test; the exact-match assertion at `handler.test.ts:136-140` must be updated
   deliberately.*
8. **Given** a host that supplies only `onCompleted` and no `onQueued`, **when** a translation runs,
   **then** `onCompleted` still carries the run identity. *Check: unit test — this is finding 8, and
   the current conditional decoration would silently fail it.*
9. **Given** a third-party `TaskRunnerProvider` compiled against 0.15.0, **when** the package is
   upgraded, **then** either it still compiles, or the break is deliberate, recorded in
   `docs/DEPRECATIONS.md` and shipped per that ledger's policy. *Check: review against finding 9.*
10. **Given** a host that registers no new callback and reads no new field, **when** it upgrades,
    **then** its behaviour is unchanged. *Check: the existing suites, unmodified except where a
    criterion above says otherwise.*

## Open questions

**Coverage scan**

- *Failure & error states* — covered by AC6; plus: if the host's cancellation callback throws, the
  existing `safe` wrapper swallows and logs (`LifecycleNotifier.ts:46-53`), and the new one should
  match. No open question.
- *Empty / loading / zero states* — an enqueue that produces no tasks returns 400 before reaching the
  runner (`enqueue-translation/handler.ts:72-76`). No open question.
- *Boundaries & limits* — a `select_all` enqueue fans out over every visible document
  (`handler.ts:81-83`). Whether the response may carry one identity per document × locale at that
  scale is **Q4** below.
- *Permissions & roles* — the cancel handler reads no identity at all today; see **Q3**.
- *Concurrency, idempotency, migration* — the append path is **Q1**; no schema migration is implied
  as long as identity rides in the `input` JSON column the plugin already owns.

**Restate check**

- "Run" — I read this as *one call to enqueue*, which may cover many documents and many locales. The
  consumer's wording in #110 ("the enqueue that produced the job") agrees. **Confirmed from input.**
- "Job" — in current code this is *one row covering one document and a list of locales*, not a
  (document, locale) pair. The issues use it in the older sense. **Flagged; this is finding 2.**
- "Cancelled" — now means only *explicit cancel*, since supersession is gone. **Flagged; finding 1.**

**Questions**

1. **[blocking] Where does run identity live so it survives to `onCompleted`?** `extendJob` merges a
   later run's locales into an earlier run's row (finding 12), so a single id per row is wrong. The
   plugin owns the job's `input` JSON column, so a per-locale map needs no schema change — but it
   changes `StoredWorkflowInput` and the normalizer. Matters because: a per-row id looks correct in
   every single-run test and silently mislabels every appended locale in production.
2. **[blocking] Does `enqueue` start returning something, or does identity flow only through
   callbacks and the response body?** `TaskRunner.enqueue` returns `Promise<void>` and is the hidden
   implemented contract (finding 9). Changing it breaks third-party providers who cannot name the
   type. Matters because: this is the difference between an additive release and one that needs a
   deprecation entry.
3. **[blocking] What may a cancellation callback say, given the handler holds only job ids?**
   Reporting document and locale requires reading the row before deleting it — an extra query on a
   path that currently does none. The alternative is a callback that reports only the id, which the
   host cannot join to anything unless Q1/Q2 gave it that id at enqueue. Matters because: it decides
   whether #106 is cheap or carries a read.
4. **[non-blocking] For a `select_all` enqueue, is a per-document × locale identity list in the
   response acceptable, or should the response stay a count and identity be read elsewhere?** Matters
   because: a bulk enqueue over a large collection would return a large body.
5. **[non-blocking] Is attempt numbering in scope?** #110 raises it; it is a separate field on
   `TranslationTask` (safe to add, finding: read-only type) but it requires the task handler to see
   the job row, which it currently does not (`PayloadJobsRunnerProvider.ts:149-162`).
6. **[non-blocking] Should `withQueuedNotification` stop being conditional on `onQueued`?** Finding 8
   means a host with only `onCompleted` is undecorated. Matters because: AC8 fails without a decision
   here.
7. **[non-blocking] Does the sync runner participate?** It mints in-memory ids
   (`SyncTaskRunner.ts:29`), creates no rows, and its `cancel` is a no-op (`:72-74`). Whether run
   identity must be meaningful there, or may be best-effort, affects how much of the design is
   runner-agnostic.

## Risks & constraints

- **`TaskRunner` is implemented by third parties but not exported.** Any change to it is a breaking
  change to people who cannot name the type. `docs/DEPRECATIONS.md` sets the policy: deprecations ship
  as `feat:`, removals batch into one major.
- **The plugin must not touch the host's `payload-jobs` schema.** Settled in
  `2026-09-04-job-history-pruning.task.md` D1 and `2026-09-08-one-live-job-per-document.task.md` D5/D6.
  The `input` JSON column is the plugin's; new columns are not.
- **`extendJob` writes the `input` column narrowly through the database adapter**, deliberately, to
  avoid the read-modify-write clobbering measured in `2026-09-08-one-live-job-per-document.task.md` D2
  (3/120 on Postgres, 1/120 on MongoDB). Any new field in that column inherits that constraint.
- **Two exact-match tests pin the response shapes** (finding 10); changing them is intended, but it
  must be deliberate rather than a surprise during implementation.
- **The ordering guarantee has no end-to-end coverage** (finding 11). If the design touches the
  ordering, the missing test must be written *first*, or there is nothing to break.
- **Three adapters.** Anything stored in the job row needs SQLite, PostgreSQL and MongoDB evidence,
  per the repository's standing practice.

## Consistency self-check

- Every in-scope item has at least one acceptance criterion: (1)→AC1-3, (2)→AC1, (3)→AC5-6,
  (4)→AC7, (5)→AC9.
- No criterion contradicts an out-of-scope line. AC4 is explicitly conditional on Q5.
- Every criterion names its check.
- Coverage-scan items are either answered inline or carried into Questions 1-7.
- Traceability: AC1-3 trace to #107/#110; AC4 to #110's retry paragraph; AC5-6 to #106 as narrowed by
  finding 1; AC7 to #103; AC8 to finding 8 — **`[inferred]`**, no issue asks for it, it rests on
  `wireTranslateRunner.ts:87` and would otherwise make AC2 false for a real host configuration;
  AC9-10 to findings 9 and 10 — **`[inferred]`**, standard compatibility obligations.

## Readiness

- Unresolved **[blocking]** questions: **3** (Q1, Q2, Q3).
- In-scope items with no acceptance criterion: **0**.

**Needs answers first.** What is still soft: all three blocking questions are about *where identity
lives and who is allowed to see it*, not about effort. They are design decisions with a published
contract on one side and a storage constraint on the other.

## Suggested next step

**Ready for `/sp-architect`.**

This is not a task-level placement decision. It introduces a concept the plugin does not have, threads
it through an interface third parties implement, changes what is persisted per job, and must survive a
merge path that unions two runs into one row.

Likely architecture vectors:

| Vector | Why |
|---|---|
| `contract` | `TaskRunner` / `TaskRunnerProvider` are implemented outside this package; two response shapes change |
| `data-model` | identity must be persisted in the job `input` column and survive `extendJob` |
| `evolution` | a breaking change to an implemented contract that cannot currently be named by implementors |
| `concurrency` | the append/merge path, retries, and the queued-before-completed ordering |

---

# Clarifications (2026-10-05) — these supersede the fork above

The owner resolved the design in conversation. **The "run identity" framing in the sections above is
withdrawn.** It merged two unrelated needs into one invented concept. What follows is the settled
shape; where it contradicts anything earlier in this document, this section wins.

## C1 — No new identity concept. The key is `(job id, target locale)`

Rejected: a plugin-minted run name. Rejected: an opaque host-supplied context stored in the job row.

The second was rejected on the owner's objection, and the objection is the right one: carrying a
host's value would make the plugin a store for data it never reads, visible to anyone with access to
the jobs table, size-unbounded, and empty on the auto-translate path where no host supplied anything.

The job row already has an id. Surfacing it costs no foreign storage and no new vocabulary.

`(job id, target locale)` was checked against the three cases that break weaker keys:

| case | result |
|---|---|
| a locale appended to a live job by a later request (`extendJob`) | **holds** — the appended locale appears once in that row, and the host was handed that row's id when it asked |
| two different requesters on the same document and locale | **holds** — `pickHost` refuses a host from a different requester (`planEnqueue.ts:68-69`), so they get separate rows and separate ids |
| a retried attempt | **does not hold** — same id, same locale. Attempts are distinguished by attempt number, a separate datum (see C4), not by this key |

## C2 — Per-locale storage was accepted, and is now mostly unnecessary

The owner accepted the per-locale principle (Q1, option A). Under C1 it mostly dissolves: the key is
built from the job's own id plus the locale the callback already carries, so no new per-locale map
needs persisting for correlation. Finding 12 still stands as the reason a per-*row* value would have
been wrong, and must stay true of anything per-row added later.

## C3 — `TaskRunner.enqueue` changes, backwards-compatibly, with a deprecation

The owner's decision: **do not look for a workaround.** Change the contract, keep current
implementors compiling, deprecate the old form, and let the removal batch into the next major per
`docs/DEPRECATIONS.md`.

Mechanism:

- Widen the return rather than replace it: `Promise<void> → Promise<void | EnqueueResult>`. An
  existing third-party implementation returning `Promise<void>` still satisfies the union and still
  compiles.
- Annotate the `void` form `@deprecated`, with a ledger anchor, matching the precedent already on this
  same interface — `findByCollection(slug, documentIds: Array<string|number>)` carries
  `@deprecated … Removed in the next major` (`TaskRunner.interface.ts:34-42`).
- Add the ledger entry. Policy is fixed: deprecations ship `feat:` (minor), removals batch into one
  `feat!:` major (`docs/DEPRECATIONS.md:21-22`).
- **Degrade, do not fail.** When a runner returns nothing, the plugin has no ids: the enqueue response
  omits them and callbacks carry none. A host that changed nothing observes no change.

**Export `TaskRunner` from `src/index.ts`.** It is implemented by third parties and currently not
exported (finding 9), so a deprecation on it is unreadable by the people it is addressed to. Additive,
breaks nobody, and closes the same gap the `RequestScope` export closed in 0.14.0
(`src/index.ts:60-66`).

## C4 — The handler asks Payload for the job row

To reach the callbacks, the job id must be available at execution time. It is not today: the
registered task handler takes only `{ req, input }` (`PayloadJobsRunnerProvider.ts:149-162`). Payload
passes the job when asked. This is entirely internal — no external contract moves.

The same change makes the row's `totalTried` reachable, which is the only way to distinguish retry
attempts. #110's retry complaint is therefore closed by the same edit rather than by a separate
mechanism, and **attempt number moves from "out of scope unless free" to in scope**, because it is now
free.

Adding fields to `TranslationTask` is safe: hosts only read it (it appears solely in callback
parameter position). Note the speed bump — `taskMapping.test.ts:21-27` and `:41-47` assert exact
shape with `toEqual` and must be updated deliberately.

## C5 — The sync runner

It creates no rows but already mints an in-memory id per task (`SyncTaskRunner.ts:29`) which it also
discards. It should return those ids so behaviour is consistent across runners; its `cancel` remains a
documented no-op.

## C6 — Cancellation: assumption, not yet confirmed

The one question the owner has not ruled on. **Proceeding on the recommended default:** read the rows
before deleting them, so the callback can name the document and target locale. One added query on a
path that currently performs none (`cancel/handler.ts:14-25` holds only ids; the delete is at
`PayloadJobsTaskRunner.ts:172-175`). The callback fires before the delete.

Rejected default: reporting only the job id, which would make the signal useless to a host that had
not stored that id. Flag to the owner if this assumption is wrong — it is the only place in this
contract where implementation proceeds without an explicit decision.

## Revised scope

In scope, in dependency order:

1. Export `TaskRunner` (additive).
2. Widen `enqueue`'s return with the deprecation and ledger entry (C3).
3. Both runners return the ids they already have (C5).
4. The enqueue endpoint returns them — **#107**.
5. The task handler receives the job row; job id and attempt number reach `TranslationTask` (C4) —
   **#110**.
6. `onCancelled` on the explicit-cancel path, firing before the delete (C6) — **#106**, narrowed:
   there is no supersede path to report (finding 1).
7. `get-collection-status` carries document id and target locale — **#103**, pure response mapping.

Out of scope, unchanged: #123; any host-supplied context; any new column in `payload-jobs`; the
consumer's editorial workflow.

## Revised acceptance criteria

Supersedes the draft list above.

1. An enqueue for one document and three locales returns, per locale, the job id that will run it.
   *Integration test, three adapters.*
2. `onQueued`, `onCompleted` and `onFailed` for a locale carry the same job id that the enqueue
   response gave for that locale. *Integration test.*
3. A locale appended by a second enqueue into a live job reports that job's id in both the response
   and its callbacks, and the first run's locale is unaffected. *Integration test exercising
   `extendJob` — the case most likely to be got wrong.*
4. With the default three attempts, a task that fails twice then succeeds produces three callbacks
   the host can tell apart by attempt number. *Unit test.*
5. An explicit cancel fires `onCancelled` naming document and target locale, before the row is
   deleted. *Unit test asserting order against the delete.*
6. A cancel for an unknown id, or one that is not this plugin's job, fires no callback and surfaces no
   error. *Unit test — negative path.*
7. `get-collection-status` names each row's document and target locale. *Unit test; the exact-match
   assertion at `get-collection-status/handler.test.ts:136-140` is updated deliberately.*
8. A host supplying only `onCompleted` and no `onQueued` still receives the job id. *Unit test — today
   `wireTranslateRunner.ts:87` skips the decoration entirely in that configuration.*
9. A third-party runner that returns `Promise<void>` still compiles, and the plugin degrades to
   omitting ids rather than failing. *Type-level check plus a unit test with a void-returning runner.*
10. A host that registers nothing new and reads nothing new sees no behaviour change. *Existing
    suites, unmodified except where a criterion above says otherwise.*

## Revised readiness

- Unresolved blocking questions: **0** (C6 proceeds on a stated assumption).
- In-scope items with no acceptance criterion: **0**.

**Ready to implement.** The architecture question that routed this to a design pass is answered by C1
and C3: no new concept, and the contract change is a deprecation of a shape that already has a
precedent on the same interface.
