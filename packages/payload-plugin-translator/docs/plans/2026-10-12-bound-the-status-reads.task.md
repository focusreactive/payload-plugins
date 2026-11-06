# Bound what the status endpoints read — implementation contract

Requirements: 2026-10-12-bound-the-status-reads.md

> **Scope narrowed on 2026-10-13, after Stage B was built and reviewed: only Stage A ships.**
> The batch was withdrawn, not abandoned — D1–D8 below are kept as the record of why, because the
> next attempt should start from them rather than rediscover them. See **Why Stage B was withdrawn**.

## Requirements / Task restatement

Issue #123. The two status endpoints load every translation job the plugin has ever written —
`findRawJobs` passes `pagination: false` with one condition — then narrow by collection and by
document **in memory**. Retention was declined as the host's job (#122, closed by PR #129), so the
table never shrinks and the cost of opening a status panel grows with the project's whole history.

Two things to build, and they are independent:

**Stage A — send the narrowing to the database.** Both reasons for filtering in memory have expired,
measured on all three adapters. Pure fix: no new surface, no behaviour change.

**Stage B — give the panel a batch.** `Translated — N` means "of the submission you just made, this
many are done", not a lifetime total. That requires a batch identity, which nothing stores today.

## What already exists — platform · installed · project · verdict

- **Platform (Payload 3.90.1).** `payload.find` takes `where` on a path inside the job's `json`
  input, plus `sort`, `limit` and `totalDocs` — measured working on SQLite, PostgreSQL and MongoDB.
  Nothing hand-written is needed to narrow a read. The job row's `createdAt` is a real column.
- **Installed.** `zod` already generates the registered `Field[]` from one schema declaration
  (`store/toPayloadFields.ts`), so a stored field is added once and reaches types, admin and
  validation. `crypto.randomUUID()` is already the id source in `SyncTaskRunner.ts:33`.
- **Project.** `RequestScope` (`shared/payload/RequestScope.shapes.ts`) already carries
  per-submission metadata — `requester` — from the HTTP handler through `enqueue` into the stored
  job input as `requester_id` / `requester_collection`. A batch id is the same kind of value on the
  same path. `visibleIds` (`features/_lib/collection-utils.ts:37`) already answers access control in
  one query however many ids.
- **Verdict.** Nothing new is built for Stage A. Stage B adds one stored field, one optional
  interface method and one response field; everything else rides existing plumbing.

## Why Stage B was withdrawn

Built, reviewed, and taken back out. The reason is not that it failed — every criterion was met on
three adapters — but that reviewing it exposed a design fault the design review had not seen.

**`TaskRunner.latestBatch?()` cannot be implemented from the contract that declares it.** A batch is
a three-step protocol: the enqueue handler mints an id onto `RequestScope.batch`; `queueWorkflow`
writes it into the **stored job input**; `latestBatch` reads it back. Only the third step appears on
the interface. A third-party runner reading `TaskRunner` is told to "return the newest submission"
and is never told that submissions arrive on the scope and must be persisted. No wording fixes that:
the fix is to put storage into the contract, which is precisely the obligation the recorded
follow-up says the interface should stop making
(`2026-10-06-lifecycle-run-context.task.md`, "Rework `TaskRunner` into a small required core plus
declared optional capabilities").

**The root cause is placement.** A batch is the plugin's own notion — it exists so a progress panel
can say "12 of 30". It was stored inside `payload-jobs`'s input shape, and everything downstream
followed from that: a field in someone else's storage, a field on a public scope type, and
a query that only one runner can answer.

**Where it belongs instead:** the plugin keeps batches itself — `batch → the handles it covers` —
since `enqueue` already answers with those handles (`EnqueueAssignment.handle`, #107). Then no runner
contract changes at all, and progress is an ordinary task query. That is a collection and a
migration, which makes it its own piece of work rather than a field in this one.

**What ships instead:** Stage A alone — the query narrowing. It closes the unbounded *document* read
outright and divides the *collection* read by the number of translatable collections. The
collection's own archive is still read, so #123 is improved, not closed. That is honest and it
changes no contract: no interface, no stored shape, no response shape.

## Decisions

### D1 — the batch id rides on `RequestScope`, not on `RequestShape` or `TaskInput`

**Chosen:** `RequestScope.batch?: string`, written into the stored input by `queueWorkflow`.

**What lost, and why:** `RequestShape` (`model/planEnqueue.ts:7`) is what `pickHost` matches a live
run against — all five of `sourceLng`, `strategy`, `publishOnTranslation`, `requesterId`,
`requesterCollection` must agree for a request to join a running job (`planEnqueue.ts:37-48`). A
batch id there would make every new submission fail to match, so it would create a **new row**
instead of appending — which both contradicts the owner's decision that an append joins the batch
already running, and manufactures the very "new row becomes the newest batch" the decision avoids.
`TaskInput` lost because a batch is per submission, not per task: N copies that can disagree.

**The constraint it cites:** `pickHost`'s equality test, and `extendJob`'s write
(`PayloadJobsTaskRunner.ts:153`) which spreads `current.input` — so an append preserves the row's
existing batch with **no code at all**, which is exactly the decided behaviour.

### D2 — the collection endpoint gets batch progress from one optional `TaskRunner` method

**Chosen:** `latestBatch?(collectionSlug): Promise<{ id: string; tasks: Task[] } | null>` — the
runner returns rows, the handler filters them through `visibleIds` and counts, exactly as it already
does for `docs`.

**What lost, and why:** extending `TaskFilter` with `batch?: string` cannot answer "which batch is
the latest" — the id has to be discovered first, so it needs a second call anyway and a magic
`"latest"` string. Reading the job rows directly from the handler lost because the handler holds
only a `TaskRunnerFactory`; reaching into the payload-jobs store would run the dependency backwards.

**The constraint it cites:** `TaskRunner` is exported from `src/index.ts` and implemented outside
the package, so the method is **optional** — `SyncTaskRunner` does not implement it and the endpoint
answers `batch: null`, which is honest there: that runner finishes every locale inside `enqueue`.

### D3 — the minted id is a server-side numeric timestamp

**Chosen:** `String(Date.now())`, minted in `enqueue-translation/handler.ts`. **Decided by the owner**,
against the recommendation below.

**What lost, and why:** `crypto.randomUUID()` was recommended — ordering no longer needs to come
from the id (D1 means no submission becomes the newest batch without creating a row, and the newest
is read off the greatest `createdAt`, a real column), so uniqueness was the only requirement left,
and two submissions in the same millisecond cannot collide under a UUID. The owner chose the
timestamp for legibility: a batch id that says when the submission happened is readable in the
admin's job list without a lookup.

**The accepted cost, stated so it is not rediscovered as a defect:** two submissions reaching the
server in the same millisecond share a batch id and their panels show a common denominator. The
owner weighed this on 2026-10-12 — the only minting caller is a person pressing a button, and the
consequence is a wrong figure in a progress panel for the life of one batch, not corrupted data.

**What is NOT accepted, and why the server mints:** a timestamp from a *browser* clock would be
poison, because the panel is shared — a clock running fast pins the panel to one person's batch for
everyone, indefinitely. The mint stays server-side, on the same clock that writes `createdAt`.

### D4 — `docs` is bounded to live rows

**Chosen:** `get-collection-status` keeps the `docs` array but adds `completedAt: { exists: false }`.

**What lost, and why:** returning the archive lost because nothing reads it — the panel counts, and
#103's reporter asked for "what is in flight across this collection" in those words. Dropping `docs`
entirely lost because the owner's rule is that the response may be narrowed, not gutted.

### D5 — the document filter offers the id in both forms the store may hold

**Superseded twice, and the final answer is the simple one.** Worth keeping the path, because each
step was a measurement correcting the one before.

1. The research doc said matching the legacy `input.collection.value` fails on SQL and works on
   MongoDB.
2. A probe during implementation corrected that: the failure depends on the **stored type**, not the adapter. The
   legacy relationship wrote a numeric collection's id as a **number**; comparing it against the
   string the plugin holds matches on **no** adapter, MongoDB included. On that reading the filter
   kept every legacy row and matched it in memory.
3. Asked why the narrowing was not simply done in the query, a third probe answered it: offering
   **both forms** — `{ in: ["5", 5] }` — matches whichever the store holds, on all three adapters.

**Chosen:** `ofDocuments` offers each id as a string and, when it is numeric, as a number too, on
both the flat `input.collection_id` and the legacy `input.collection.value`. The whole document
narrowing is therefore done by the database.

**What lost, and why:** keeping every legacy row and matching it in memory (step 2) lost because it
left the read bounded only by collection for any project with pre-migration rows — a real cost, paid
for a limit that does not exist.

**What this leaves in memory:** the `readCollectionRef` pass is no longer load-bearing. It now only
catches a row carrying **both** reference shapes with different values, which nothing writes. It is
kept so that `readCollectionRef` stays the single authority on which collection and document a row
belongs to, with the query as the narrowing rather than the decision.

### A note on where Stage A is proven

`ofCollection` / `ofDocuments` return a `Where` — data handed to Payload. A unit test over them
could only restate the literal they build, which proves nothing about whether the database agrees.
They are therefore proven by the integration criteria AC1–AC4 against real adapters, and carry no
unit test of their own. Recorded so a later reviewer does not read the absence as an oversight.

### D6 — "newest submission" is the greatest batch id, found over a bounded window

**This overturns a decision taken during design.** That decision said the newest batch could be
read off the row with the greatest `createdAt`, justified by the append case: a submission that only
appends creates no row, so it cannot displace the batch on show. That reasoning is sound and still
holds — but it is not the whole case, and a reviewer found the half it missed.

**The disproof, reproduced on all three adapters.** `enqueue` queues a submission's documents in
sequential groups of `ENQUEUE_CONCURRENCY`, so a large submission goes on writing rows for seconds.
A smaller submission made *later* finishes writing first. When the large one's last rows land they
carry the greatest `createdAt`, and from then on — permanently, since no further writes follow — the
panel shows the **earlier** submission. The later submitter never sees their own work.

```
earlier=1791884660017  later=1791884660028  shown=1791884660017   SQLite
earlier=1791884662976  later=1791884662997  shown=1791884662976   PostgreSQL
earlier=1791884665909  later=1791884665930  shown=1791884665909   MongoDB
```

**Chosen:** newest means the **greatest batch id** — the moment the submission was made — taken in
memory over the newest `RECENT_BATCHED_ROWS` (500) rows that carry one. Decided by the owner: the
batch id is a timestamp, so the newest submission is the rows carrying the most recent one.

**What lost, and why.** Sorting on the id itself (`sort: '-input.batch'`) is the obvious answer and
was **measured not to work**: PostgreSQL orders correctly, SQLite and MongoDB silently return the
wrong row. Taking the greatest id among *live* rows only is exact and needs no window, but the panel
would go blank the moment a submission finished — losing the "30 of 30" the owner asked for.

**What the window costs, stated so it is not rediscovered as a defect:** a submission of more than
500 documents can still hide a later, smaller one. The read stays bounded and constant whatever the
collection's history, which is what #123 is about.

### Placement

| Piece | Lands in |
|---|---|
| collection + document conditions | `payload-jobs-runner/PayloadJobsTaskRunner.ts` — `findByCollection` |
| the `where` for the two stored reference shapes | a new unit beside `readCollectionRef.ts` in `store/` — it is knowledge of how Payload stores the reference |
| `batch` on the scope | `shared/payload/RequestScope.shapes.ts` |
| `batch` as a stored field | `store/jobInput.schema.ts` → `WorkflowInputSchema` |
| minting | `features/enqueue-translation/handler.ts` |
| `latestBatch` | `TaskRunner.interface.ts` + `PayloadJobsTaskRunner.ts` |
| counting + visibility | `features/get-collection-status/handler.ts` |

`store/` holds "the shape of what a framework stores and the readers that turn it into ours" per
the package conventions, which is what a `where` over two storage shapes is. `model/` must not import it back.

### New surface

- `RequestScope.batch?: string` — callers: `enqueue-translation/handler.ts` (writes),
  `PayloadJobsTaskRunner.queueWorkflow` (reads).
- `TaskRunner.latestBatch?()` — callers: `get-collection-status/handler.ts`, and
  `PayloadJobsTaskRunner` implements it. One caller today; it is a method on an interface that
  already exists, not a new abstraction, and it has no inline alternative (D2).
- A `where` builder for the collection reference — callers: `findByCollection`, and the document
  narrowing in the same method.

### Written contract?

**Yes, three things no signature states**, so `latestBatch` is tested contract-first:

1. `latestBatch` returns `null` both when the runner has no notion of batches and when the
   collection has none — the caller cannot tell those apart and must not need to.
2. The batch id is opaque. Callers compare it and hand it back; they never parse it.
3. An append to a live run does not change that run's batch, so a submission that only appends
   leaves the newest batch where it was.

### Does this need a separate design?

**No.** Stage B adds a field to an existing stored shape and an optional method to an existing
interface; the placement is named above and follows the package's `store/` vs `model/` split. No new
seam, no new dependency, no migration (the column is `json`).

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1, R2 | `findByCollection` sends a collection condition; a read for collection X loads no row of collection Y | new integration test, two collections, asserting rows returned by the runner | the case runs green on sqlite, postgres and mongo |
| AC2 | R2, R7 | A row carrying the legacy `input.collection` relationship is still found | new integration test seeding one row of each shape | both rows come back, all three adapters |
| AC3 | R1, R2 | `get-document-status` loads only that document's rows | new integration test with two documents in one collection | only the asked document's rows are read |
| AC4 | R4, R5 | A document whose French run is older than ten German runs still reports French | new integration test with a skewed history | French appears in the answer |
| AC12 | — | No new type errors | `bun run check-types` from the package | no error naming a changed file |
| AC13 | — | No new lint findings | `bunx oxlint .` from the package | 47 warnings, 0 errors, or fewer |
| AC14 | — | Nothing already passing regressed | `bunx vitest run`; `bun run test:integration:sqlite` from `apps/dev` | ≥ 2057 unit tests and ≥ 224 integration tests pass |

## Pre-flight

Run against the untouched tree on `feat/translator-bound-status-reads`, before any edit.

| AC | Command | Result | Classification |
|---|---|---|---|
| AC1–AC4 | the named tests | **do not exist yet** | change — each gets its red run during implementation, recorded with the failure reason |
| AC12 | `bun run check-types` | passes, 0 errors | invariant |
| AC13 | `bunx oxlint .` | 47 warnings, 0 errors | invariant |
| AC14 | `bunx vitest run` | 148 files, 2057 tests passed | invariant (baseline) |
| AC14 | `bun run test:integration:sqlite` | 58 files passed / 4 skipped, 224 passed / 7 skipped | invariant (baseline) |

## Risk notes

**Risk classification: HIGH**, and the reasons are specific rather than ceremonial:

- `TaskRunner`, `TaskFilter` and `RequestScope` are all re-exported from `src/index.ts` and
  implemented outside the package. Stage B touches all three.
- Stage B changes a **stored** shape and two endpoint responses.
- `findByCollection` is on the enqueue path as well as the status path, so Stage A's condition is
  load-bearing for cancellation and supersede logic, not only for display.

What that binds downstream: a test is required before any part is called done; the regression
sweep is mandatory and must name what was grepped and how many call sites were read; review covers
three angles rather than one.

**Specific hazards:**

- `ownJobs()` is an `or` because a workflow row carries no `taskSlug`. Every new condition is
  **added to** it, never substituted — a replacement silently returns nothing.
- `visibleIds` runs **after** the read in both endpoints. Narrowing by ids must not become a way to
  skip it; the order stays.
- The legacy `input.collection` branch leaves at the next major. The `or` must be written so that
  deleting one branch is the whole change.
- A submission whose every locale is an append mints an id that names no row. The panel is correct
  (it shows the running batch, per AC6), but the returned id is inert. Recorded rather than fixed —
  nothing reads it today.

## Decisions by the owner

- **2026-10-12** — narrowing the panel to the admin list's current page is rejected: the status
  covers the whole collection, because a page-only figure would mislead.
- **2026-10-12** — the `Translated` figure is the current submission, not all history.
- **2026-10-12** — an append-only submission joins the batch the live row already carries; the row
  is not re-stamped.
- **2026-10-12** — with no batch, the panel shows zeros; there is no fallback to displaying live
  work.
- **2026-10-12** — a global multi-collection dashboard is out of scope, not needed yet; nothing is
  built for it.
- **2026-10-12** — scope: both stages in one task rather than narrowing first. The whole diff is
  therefore graded at HIGH risk, including Stage A.
- **2026-10-12** — the batch id is a numeric timestamp, not a UUID, consistent with the earlier
  decision. See D3 for the cost that choice accepts.
- **2026-10-13** — `batch` accepts `boolean | string`, not `true | string`: `false` must mean "track
  nothing" rather than a 400, so a caller computing the flag is never rejected. Measured: the
  narrower schema rejected `false`.
- **2026-10-13** — a batch with no visible documents keeps answering with its id; see D7.
- **2026-10-13** — nothing goes in the README: `batch: true` is not a public contract, just like the
  endpoints, and a plugin user has no way to reach it. See D8.
- **2026-10-12** — the endpoints' HTTP contract is not public. A host that builds its own admin on it
  carries that risk; the contract is not broken outright, and the fact is still weighed.

## Red runs and mutations

**Red run** — `docs/plans/artifacts/2026-10-13-bounded-status-reads-red-run.txt`. Two change-criteria
failed for their own reason (another collection's rows loaded; another document's rows loaded); the
two invariant criteria in the same file passed, as they must. Two criteria were *broken* rather than
red on the first attempt — a wrong response shape and an invalid `workflowSlug` — and were fixed and
re-run rather than counted.

**Mutations, one per claim, each reverted:**

| Mutation | Went red | Proves |
|---|---|---|
| `ofCollection` matches any row instead of one collection | "loads no job row belonging to another collection", alone | the collection narrowing is guarded |
| `ofDocuments` matches the legacy document id | "still finds a legacy row when asked about one document", on SQLite and PostgreSQL | D5 is guarded where the distinction exists; on MongoDB ids are not numeric, so the case cannot arise and the test says so |
| `extendJob` re-stamps the appended row's batch | "leaves a running submission's id alone…", alone | the owner's append decision is guarded |

The first run of the second mutation turned **nothing** red. That finding prompted the
re-measurement that corrected D5 — the fixture had to seed a number-stored id before the test
could discriminate.

## Regression sweep

Every public surface this diff touches, and what was read:

| Surface | Verdict |
|---|---|
| `TaskRunner` (public, implemented outside the package) | gained an **optional** method; a third-party implementation that compiled before still compiles |
| `RequestScope` (public) | gained an **optional** field; additive |
| `TaskFilter` (public) | unchanged |
| client status types | **not** public — `GroupedCollectionTranslationStatus` was never re-exported from `src/index.ts`, so replacing it breaks no consumer |
| `findByCollection` — 3 callers, all read | `get-collection-status`, `get-document-status`, and `cancel-by-collection:30`. The third is the **destructive** one and was not in the original design; it passes no `documentIds`, so it reads the same row set as before, narrowed in the query instead of in memory. 13 unit + 5 integration cases green. |
| `jobInputFields.baseline.json` | changed by exactly one added field (`batch`, text, maxLength 256); the task list is untouched. It reaches a host's generated types, so it was updated deliberately. |

### D7 — a batch with no visible documents still answers with its id

Raised by a reviewer and **declined by the owner**: when a caller may read none of a batch's
documents, `GET /collection/:slug` still answers `batch: { id, 0, 0, 0, 0 }` rather than `null`, so
that caller can tell "a submission happened, not for me" from "no submission happened" — and the id
is a timestamp, so they learn when.

**Decided: leave it.** A user with read access to the collection may read the count too; a user
without it cannot open the collection at all.

**One correction to that reasoning, recorded because it is load-bearing if the decision is ever
revisited.** The endpoint has **no collection-level read check of its own**. Two gates stand in
front of it: the host-configured `AccessGuard` (`withAccessCheck` — "may this user use the translator
at all"), and `visibleIds`, which applies the collection's rules per document. So the owner's
reasoning holds for the admin UI, where Payload hides a collection the user cannot read — but the
route can be called directly, and then only the host's guard applies.

What leaks in that case is one fact with no document, locale or name attached: that a submission
happened, and when. A host whose guard is coarse has made that choice for the whole translator
surface, not for this field.

### D8 — nothing from this work goes in the README

The package convention "Documenting feature versions" asks for a `Since vX.Y.Z` note in the README beside new
**public API**, which it defines as anything re-exported from `src/index.ts`. Measured against that
definition, this work adds none:

| Thing | Who can reach it |
|---|---|
| `batch` on `POST /translate/enqueue` | nobody outside the package. The only caller is the plugin's own panel, `BulkTranslationDashboard.tsx:84`. |
| `scope.batch` | written in one place, `PayloadJobsTaskRunner.ts:193`. A consumer has no way to set it. |
| the `{ batch, docs }` response | the HTTP contract, which the owner has ruled is not public surface. |
| `TaskRunner.latestBatch?()` | genuinely reachable — by someone writing their **own** runner. That reader is in the interface's JSDoc, not the README, and the method carries `@since 0.17.0` there. |

**Decided: no README change.** Documenting the enqueue input or the response shape would publish an
internal contract and invite consumers to depend on it — the opposite of the owner's position that
the endpoints are not public. `src/index.ts` is unchanged, so the convention's own trigger never
fires.

## Review log

**2026-10-13 — review, one pass per angle (high risk).**

| Angle | Result |
|---|---|
| correctness of the narrowing | no findings. Traced every row shape through `ofCollection` / `ofDocuments` and the in-memory pass, confirmed `ownJobs()` is combined rather than replaced on all four query paths, and checked `exists` on a nested JSON path in the adapters' own source. |
| the batch feature | **one major finding, confirmed and fixed** — see D6. One question raised for the owner's decision: a caller who may read none of a batch's documents still receives the batch id with zero counts. |
| contract and tests | contract clean: the optional method and optional field are additive, `src/index.ts` untouched, ADR-0002 satisfied. Five test gaps; two (AC11, AC8a) had already been closed during the review, two more closed after it (`latestBatch` unit coverage; the join-by-id path, now covered by the D6 regression test). The fifth is the README note, which is the owner's to write. |

Mutations added for D6: restoring `limit: 1` turns "shows the submission made last, not the one whose
row landed last" red, alone, and nothing else.
