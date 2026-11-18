# Bound what the status endpoints read

Source: 2026-10-12-bound-the-status-reads.source.md

## Parsing summary

- Source: a question from the owner, plus issue #123 filed 2026-09-03.
- Ask: stop the two status endpoints loading every job row, and have the fix work on SQLite,
  PostgreSQL and MongoDB alike.
- The owner recalled a narrowing already landing; that is checked first.
- #123 measured the problem, listed three options, and set its own priority to Low. That stands.
- Contradiction worth naming: #123's table shows a "narrowed to one collection" column as if it
  shipped. It did not — the commit that would have carried it says narrowing was rejected.

## The owner's premise, checked first

**Partly right.** There *is* a narrowing, and it is not the one that bounds growth.

`PayloadJobsTaskRunner.findRawJobs` sends exactly one condition, `ownJobs()`:

```ts
{ or: [{ workflowSlug: { equals: workflowName } }, { taskSlug: { equals: taskName } }] }
```

That keeps other plugins' and the app's own jobs out of the result — real, and worth having. It does
not narrow by collection, by document, by age or by count, and `pagination: false` means every
matching row comes back. So this plugin's whole history still arrives on every panel open.

The `excludeCompleted` filter added by #108 *is* a bounding narrowing, but the status endpoints
cannot use it — completed jobs are what they display — and they pass no filter at all.

## The two reasons for filtering in memory, re-measured

Both reasons are on the record. **One has expired and the other is answerable in a single query.**
Measured on Payload 3.90.1 against all three adapters, with a throwaway integration probe (since
removed; the dev containers were started for the run and stopped again afterwards).

| What was asked of the database | SQLite | PostgreSQL | MongoDB |
|---|---|---|---|
| `input.collection_slug` `equals` | ✅ 1 | ✅ 1 | ✅ 1 |
| `input.collection_id` `equals` | ✅ 1 | ✅ 1 | ✅ 1 |
| `or` of the flat path **and** the legacy `input.collection.relationTo` | ✅ **2 of 2** | ✅ **2 of 2** | ✅ **2 of 2** |
| `limit: 1` + `sort: -createdAt`, reading `totalDocs` | ✅ ok, total 2 | ✅ ok, total 2 | ✅ ok, total 2 |
| legacy `input.collection.value` `in` (matching by **id**) | ❌ 0 | ❌ 0 | ✅ 1 |

Readings:

1. **The SQLite JSON-path bug worked around in `675b34a8` is fixed.** A `where` on a path inside the
   job's `json` input now matches on every adapter. That was the first and larger reason for reading
   everything and filtering afterwards, and it no longer applies.
2. **One query can cover both storage shapes.** An `or` across the flat `collection_slug` and the
   legacy `collection.relationTo` returned both rows everywhere. The second reason — "a where clause
   sees only the first" (`2c92472e`) — is answered by writing the clause as an `or`. Note it must
   match on `relationTo` (a collection name, a string), not on `value`: matching the legacy id still
   fails on SQL, which is the original bug surviving in the one place that compares a stored JSON
   number against a string.
3. **Payload gives `limit`, `sort` and `totalDocs` on this collection**, so bounding is mechanically
   available.

The probe row that reads `total=0` is incidental and worth recording: filtering by
`taskSlug: translate_document` alone returns nothing, because the row is a *workflow* job whose
`taskSlug` is null. That is why `ownJobs()` is an `or` — and it is the trap any future narrowing
must not walk into.

## Who the two endpoints are actually for

Measured by reading every consumer, not by reasoning about the response type. **The collection
endpoint has two audiences, and neither of them wants the archive.**

**Audience one — the plugin's own panel — reads nothing but counts.** Every consumer of
`get-collection-status`:

| Consumer | What it takes from the response |
|---|---|
| `CollectionTranslationProgress.tsx:63` | `data[key].length` — the number in a row |
| `panelStatus.ts:113-116` | `.length > 0` on four groups — picks the panel's marker |
| `useCollectionTranslationStatus.ts:47` | `.some(status is pending or running)` — whether to keep polling |
| `BulkTranslationDashboard.tsx:72` | the four lengths again — whether to show the panel at all |

`id`, `collection_id` and `target_lng` cross the wire on every row and are read **nowhere**. The
panel is a bulk-translation progress indicator: a Queued row with a cancel button, a Translating row
that pulses.

**Audience two — an external host — reads the rows, and only the live ones.** Those three fields are
not vestigial: #103 (`denis-urban`, closed by #177 two weeks ago) asked for them by name, to build
"the queue view for an admin dashboard". Its own words: *"what is in flight across this collection"*,
rendering *"the French translation of page 42 is running"*. In flight — not the archive.

**What that audience is worth, decided by the owner (R10):** the HTTP contract is not public surface,
so a host building on it carries its own risk. It is weighed, not obeyed. The response may be narrowed;
it may not be gutted.

That costs nothing here, because both audiences are served by the same **live** set, which
`completedAt: { exists: false }` already bounds — the filter #108 added and this research previously
recorded as unusable for these endpoints.

**What that leaves.** Exactly one thing is unbounded and wanted: the panel's `Translated — N` count,
which today means *document-locale pairs completed in all of history*. And it cannot be answered by a
database aggregate, for a reason that is specific and worth stating:

- the fan-out is per locale, from `input.target_lngs`, a **json array** — so one row is N tasks;
- per-locale completion is read from the job's `log` array, also json: a completed *row* can hold a
  succeeded French and a failed German (`normalizeJob.ts:72-84`);
- `visibleIds` filters through the **content** collection's read rules after the fact, so a count over
  the jobs table cannot honour access control.

`limit: 1` + `totalDocs` is available and measured, but it counts job **rows** — neither documents nor
locale pairs. There is no exact count of the archive without reading the archive.

## The live/archive split is exact

Measured, not assumed, because option H's correctness rests on it: **does `completedAt: { exists: false }`
drop anything other than the `Translated` row?** It does not.

1. Payload sets `completedAt` only on the success path — `runJobs/runJob/index.js:50`, under the
   comment "Workflow has completed successfully". A run that exhausts its retries goes through
   `handleWorkflowError` instead and keeps `completedAt` empty.
2. The workflow handler walks the locales in a loop and rethrows on the first failure
   (`PayloadJobsRunnerProvider.ts`, `throw error` inside the `catch`), so the loop cannot reach its end
   with a locale unfinished.

**Therefore a job row carrying `completedAt` has every locale in `target_lngs` succeeded.** A completed
row cannot hold a failed locale, even though `normalizeJobLocales` is written to allow one
(`normalizeJob.ts:72-84` reads each locale's latest log entry and would mark a non-succeeded one
`failed`).

So the four panel rows partition cleanly: `Translating`, `Queued` and `Failed` come from rows with
`completedAt` empty — each bounded by work in flight — and `Translated` is the archive and nothing
else. The unbounded read exists to produce one number in one row.

## Codebase map

| Thing | Path |
|---|---|
| collection-status endpoint | `src/server/features/get-collection-status/handler.ts:38` |
| document-status endpoint | `src/server/features/get-document-status/handler.ts:40` |
| the read | `src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts` — `findByCollection`, `findRawJobs`, `ownJobs` |
| the filter contract | `src/server/modules/task-runner/TaskRunner.interface.ts` — `TaskFilter` |
| two-shape reference reader | `src/server/modules/task-runner/payload-jobs-runner/store/readCollectionRef.ts` |
| where the input shape is declared | `src/server/modules/task-runner/payload-jobs-runner/store/jobInput.schema.ts` |
| how Payload stores it | `node_modules/payload/dist/queues/config/collection.js` — `{ name: 'input', type: 'json' }` |
| the dashboard that opens the panel | `src/client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.tsx` |
| the client query | `src/client/entities/translation/api/queries/useCollectionTranslationStatus.ts` |

Prior art: #108 (merged, bounded the enqueue/cancel paths), #123 (this), #122 (retention — closed
deliberately on 2026-09-04 by PR #129, which documented pruning as the **host's** job rather than
adding it to the plugin; `README.md:384`). No pruning exists inside the plugin, and none is planned.

## Problem Statement

Opening a translation status panel reads every translation job this plugin has ever created, with no
limit and no paging, and narrows to the requested collection afterwards in memory. The cost of
looking at status therefore grows with the project's whole translation history, and since #108 that
history no longer prunes itself. The two workarounds that forced the in-memory filter — a Payload
bug on SQLite, and two storage shapes for a document reference — no longer force it.

## Requirements

- R1 (in) The two status endpoints must stop reading rows that belong to other collections.
- R2 (in) Whatever is done must behave the same on SQLite, PostgreSQL and MongoDB.
- R3 (out) Checking the owner's recollection about an existing narrowing — answered by this research
  under "The owner's premise, checked first", so an implementation inherits the answer rather than
  the task.
- R4 (in) A document's status must not lose a locale whose most recent run is older than other
  locales' runs.
  > "`get-document-status` keeps the latest job **per target locale**, so if one locale's most recent job is older than N others, that locale's row silently disappears. A count bound trades a slow correct answer for a fast wrong one" (#123)
- R5 (in) A document translated long ago must still report that it was translated.
  > "A document translated three months ago stops reporting a status, and the editor cannot tell "never translated" from "translated long ago"" (#123)
- R6 (out) Bounding by count alone.
  > "A count bound trades a slow correct answer for a fast wrong one, which is the same failure the unpaginated read was avoiding." (#123)
- R7 (in) [inferred] Rows written before the ID-agnostic migration must keep being found — rests on:
  `readCollectionRef` reads both shapes today, and `docs/DEPRECATIONS.md#jobs-input-collection-field`
  keeps the legacy shape until the next major.
- R8 (out) Deferred with the batch, see the task contract's "Why Stage B was withdrawn". The collection panel keeps reporting on the **whole collection**, not on the documents the
  admin list happens to be showing; a page-only figure would mislead (decided by the owner).
- R9 (out) Deferred with the batch. The panel's own needs are counts per status; the endpoint must not read rows it only counts.
- R10 (out) Moot: the response shape is unchanged. `get-collection-status` may be narrowed but not broken outright: the document id and the
  target locale stay on whatever rows it still returns. The HTTP contract is **not public surface** —
  nothing in `src/index.ts` or the README describes it — so the host that filed #103 is a fact to weigh,
  not a constraint that binds the design.

**Non-functional scan.** Performance — the point of the work. Security/access control — relevant:
`get-collection-status` filters results through `visibleIds` after the read, so narrowing the query
must not become a way to skip that check. Accessibility — N/A, no UI change. i18n — N/A. Observability
— relevant but minor: a bounded read that silently truncates should be distinguishable from an empty
one.

## The options, with what each costs

**A — narrow by collection in the query.** An `or` over the two shapes, measured working everywhere.
Divides rows by the number of translatable collections and nothing more: one collection's history
still grows linearly. Cheap, no information lost, no behaviour change. Does not satisfy R1 on its own
in the long run, but it is the floor under every other option.

**B — narrow `get-document-status` by document.** `input.collection_id` is now queryable on all three
adapters. That endpoint asks about exactly one document, so its read becomes bounded by how many
times *that document* was translated — not by the table. This is a fix rather than a trade: nothing
is lost, R4 and R5 are untouched. The `documentIds` filter already exists in `TaskFilter` and is
applied in memory; this moves it into the query.

**C — narrow `get-collection-status` by the documents the panel is showing.** ~~Pass the admin list's
page of ids and read only those.~~ **Rejected by the owner under R8:** a panel that says "the
collection" while reporting one page of it misleads the person reading it. Not revisited.

**H — bound both endpoints to live work, and count the rest.** Falls out of "Who the two endpoints are
actually for": `completedAt: { exists: false }` is exact, bounded by what is in flight, and serves
both audiences — the panel's three in-progress rows and #103's queue view. The archive is then only
ever a number, never rows. Costs: the `Translated` count needs an answer of its own (the open question
below), and the response gains a shape the host did not have.

**I — a plugin-owned index collection** (document × locale → latest state), as real columns. This is
option G, and it reads very differently now that the panel is known to want counts: four bounded
`count` queries answer it exactly, including the archive, with no json path and no fan-out in memory.
Costs: a collection, a migration, and a second source of truth that can drift from the job rows. Still
not justified while A, B and H are unspent — but it is the answer if the archive count must stay
exact.

**D — bound by age.** Rejected by R5, and #123 already explains why.

**E — bound by count.** Rejected by R6 and R4.

**F — retention (#122).** Stops the table growing, which would remove the question for every endpoint
at once and lose no visible information. #123 says "if retention lands, this issue likely closes
unfixed", and the commit that created the need says retention went "from tidiness into a requirement".
**But retention is not coming from this plugin.** #122 was closed by documenting it as the host's
responsibility (PR #129, `README.md:384`), on the stated ground that `deleteJobOnComplete` is the
host's global setting and the plugin has no business overriding it. That reasoning holds — and its
consequence is that F is not an option this plugin can exercise. The escape hatch #123 leans on
belongs to someone else and may never be used, so the two endpoints have to be sized for a table
nobody is pruning.


## Acceptance Criteria (draft)

| AC | Covers | Criterion | How it is checked |
|---|---|---|---|
| AC1 | R1, R2 | `get-document-status` for a document loads only that document's job rows | integration test counting rows returned by the runner, on all three adapters |
| AC2 | R1, R2, R7 | A collection filter written as an `or` over both reference shapes returns rows of both shapes | integration test seeding one row of each shape, on all three adapters |
| AC3 | R4 | A document whose French run is older than ten German runs still reports French | integration test with a skewed history |
| AC4 | R5 | A document translated long ago still reports its status | integration test with an aged row |
| AC5 | R2 | The narrowed query matches the same set the in-memory filter matched | the existing status integration tests stay green on all three adapters |
| AC6 | R1 | Opening the panel does not read rows of another collection | integration test with two collections, asserting the row count |
| AC7 | R8 | The panel's figures cover the whole collection, not the admin list's current page | integration test: a document outside the listed page still counts |
| AC8 | R9 | The endpoint does not load rows whose only use is being counted | integration test asserting rows read against an archive of known size |
| AC9 | R10 | Each returned row still names its document and target locale | the existing `handler.test.ts:144` stays green |

## Open Questions

1. **What the panel's `Translated — N` row should count** *[resolved — see Clarifications]* — the one remaining unbounded
   figure, and the only decision left. Matters because: it is user-visible text in a *progress* panel,
   and there is no exact count of the archive without reading the archive (see "Who the two endpoints
   are actually for"). The candidates, with what each costs:
   - *drop the row* — the panel becomes purely about work in flight, everything is bounded, nothing
     else changes. Cheapest, and arguably a fix: "Translated — 1,284" in a bulk-progress panel tells
     a person nothing they came for;
   - *count this batch* — "42 of 50 done", bounded by the enqueue, closest to what a progress panel
     means, but needs a notion of "this batch" the plugin does not have today;
   - *keep it exact over all history* — forces option I, the index collection, with its migration and
     its second source of truth;
   - *count job rows instead of locale pairs* — one bounded query, but the number silently changes
     meaning and would overcount a document translated twice.

   A note on scope: whichever is chosen, it is a change to what an editor sees, so it belongs to the
   owner and not to an implementer.
2. **Is retention (#122) wanted, and with what policy** *[resolved]* — answered by the close of #122:
   pruning is the host's, on the ground that `deleteJobOnComplete` is the host's global setting. So
   this work cannot wait on retention landing in the plugin, and #123's "likely closes unfixed if
   retention lands" does not apply.
3. ~~**Should #122 be reopened**~~ — no. It was not closed by oversight; it was declined with a reason
   that still holds, and the decision is documented where a consumer reads it (`README.md:384`).
4. **Failure and empty states** *[non-blocking]* — a bounded read that hit its bound should be
   distinguishable from an empty result. Nothing today says which it was.
5. **Access control** *[non-blocking]* — `visibleIds` filters after the read. Narrowing by ids supplied
   by the client must not become a way to ask about documents the caller cannot see; the existing
   check already covers it, and must be kept in that order.
7. **What the panel shows after a page reload** *[blocking]* — the batch's handles live in the enqueue
   response, so reloading the admin list loses them. Matters because: it decides whether the panel
   needs to persist the handle list (URL parameters or session storage, a client-side change) or
   whether it may fall back to "what is still in flight for this collection" — which is bounded too,
   but whose denominator shrinks as runs finish, so a reload during a 10-document batch could read
   "3 of 3" where the person expects "7 of 10".
8. **Restate check** — the owner's recollection of a narrowed search window could mean either
   "fewer rows per query" or "a shorter period of history". This research reads it as the first.

## Clarifications

**What `Translated — N` counts: the current run, not all history.** The owner's decision, and it
reframes the whole task — the figure was never meant to be a lifetime total. If an editor selects
ten documents and starts a translation, the row shows how many of those ten are translated.

**The batch is already identified, on the wire, today.** `POST /api/translate/enqueue` answers with
`assignments: [{ collection_slug, collection_id, target_lng, handle }]` — one entry per document and
locale, each naming the run that carries it (`enqueue-translation/handler.ts:101`,
`model.ts:36`). That shipped in #177 for issue #107. **The client throws it away**: 
`useQueueDocumentTranslation.ts:27` types the response `{ data: null }` and returns `Promise<void>`.

So the panel can hold the batch's handles and ask for exactly those job rows. That query is
`id: { in: [...handles] }` — a primary-key lookup, bounded by the batch the person started, exact, and
needing nothing from a json path on any adapter. It is cheaper and more correct than every option
weighed above, and it makes the collection-wide archive read unnecessary rather than merely smaller.

**The one gap it leaves: a page reload loses the handles**, because they live only in the client's
mutation result. See Open Question 7.

## "The last run" is not a stored fact

Asked by the owner: can the `Translated` figure be read from the last translation run, so it is always
shown without the client holding anything? **Not today.**

A run, in the data, is one job row and it is about **one document** — `collection_slug`,
`collection_id`, `source_lng`, `target_lngs`, `strategy`, `publish_on_translation`, `requester_id`,
`requester_collection` (`jobInput.schema.ts:12-34`). Translating ten documents creates ten independent
rows. **Nothing records that those ten rows were one submission**, so "the last run across the
collection" cannot be queried — it was never written down.

Three ways to make it queryable:

| | How | Cost |
|---|---|---|
| **J** | stamp a batch mark into each row's `input` at enqueue; the panel reads the newest mark for the collection, then that mark's rows | one field. `input` is a `json` column, so **no migration**. A `where` on a path inside `input` is measured working on all three adapters |
| **K** | no new field — take the newest rows by `createdAt`, `sort: -createdAt` + `limit` | free and measured, but the bound is arbitrary and two editors submitting at once blend into one figure |
| **L** | a collection of batch entries: batch × document × locale × handle | exact, real columns, survives everything — but a new collection, a migration, and a second source of truth that can drift from the job rows |

**J's one wrinkle, and its answer.** `enqueue` does not always create a row: when a locale is requested
for a document whose run is already live, it appends to that run instead (`extendJob`,
`PayloadJobsTaskRunner.ts:134`). Such a row carries the older batch mark, so the new batch would
under-report. Re-stamping the row with the new mark on append resolves it, and is correct for the
panel's purpose — the row genuinely is part of the newer submission now.

J makes the archive read unnecessary rather than smaller, which closes #123 outright.

## Risks & Constraints

- The legacy reference shape leaves in the next major; an `or` written now becomes a single clause
  then, and should be written so that deleting one branch is the whole change.
- `ownJobs()` is an `or` for a reason — a workflow row has no `taskSlug`. Any new clause must be
  combined with it rather than replacing it.
- The collection-status read feeds an access-control filter applied afterwards. Order must not change.

## Readiness

- Unresolved `[blocking]` questions: **1**
- IN requirements with no acceptance criterion: **0**

Needs answers first — one question, and a narrow one. Everything else is settled: A and B are free
and measured, C is rejected by the owner, F is not this plugin's to exercise, and H follows from the
consumers. What is soft is only what the `Translated` figure should mean.

