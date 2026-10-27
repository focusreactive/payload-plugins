Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #4

# Step 4 — blocking replaces merging

## Requirements / Task restatement

Today a second request for a document already being translated is *merged* into the live run: the
runner picks a host job, appends the locales it lacks, and reports the rest as already covered. That
machinery is `planEnqueue`, `pickHost`, `alreadyCovered`, `covers` and `extendJob`, and it still
leaves cases only the host's `jobs.enableConcurrencyControl` covers.

This step replaces all of it with a refusal: **while a document has an unsettled run, a new request
for that document is turned away**, and the turning-away is told apart from a refusal by rights. The
decision is the plugin's, taken above the runner, so both ways in — the HTTP route and the
auto-translate hook — obey it.

Covers R4 of the design.

## What already exists — platform · installed · project · verdict

- **Platform.** Nothing new. The plugin stops reading `jobs.enableConcurrencyControl`: with blocking
  there is no second run for the flag to serialise.
- **Installed.** Nothing new is added.
- **Project.** Step 3 gave the store the read this needs in all but name —
  `findLiveInCollection(slug)` — and the enqueue route already splits its work two ways and already
  branches on `select_all`. `authorisedWork` is the shape the new split copies: distinct document
  ids out, tasks in.
- **Verdict.** Nothing new is designed. One concept is named: whether a document is free to take new
  work.

## Decisions

**D1 — the policy is pure and lives in `core/domain/runs/`.**
Chosen: `admitWork({ work, inFlight })` over plain shapes, with the Payload-side read in the store
and the orchestration in the two callers. Lost: deciding inside `PayloadJobsTaskRunner`, where the
merge logic lives today. That is where it has always been, and it is why the rule is unavailable to
the sync runner and to any runner a host writes. `core/` cannot import Payload (package
`CLAUDE.md`), which is the point: the rule structurally cannot reach back into job rows.

**D2 — "busy" is a field of its own, never folded into `refused`.**
Chosen: `POST /enqueue` answers `{ queued, refused?, busy?, assignments? }`. Lost: one list. The two
mean opposite things to the person reading the panel — *you may not* versus *not yet* — and the
second resolves by itself. A client that showed them together would tell an editor they lack rights
they have.

**D3 — blocking reads liveness, not history.**
A document whose runs have all settled takes new work, whatever those runs did. The predicate is the
one the record already has an index for, `settledAt` absent.

**D4 — `select_all` asks about the collection, the id list asks about its documents.**
Chosen: the handler's existing `select_all` branch picks the read —
`findLiveInCollection(slug)` for the whole collection, `findLiveForDocuments(slug, ids)` otherwise.
Lost: one read for both. A `where … in [every id in the collection]` is the query `select_all` would
produce, and SQLite's bound on host parameters makes that a real failure rather than a slow one.

**D5 — auto-translate skips a busy document, silently to the editor.**
Chosen: the hook drops the work and logs. Lost: queueing anyway, and failing the save. Confirmed by
the owner: "если занято и уже стоит перевода, значит отказ. Поле просто останется помеченым как
устаревшее, не критично" — the staleness marker survives, so the document is visibly out of date and
the next save or a manual run picks it up.

**D6 — the host's `enableConcurrencyControl` is still honoured, never set.**
The workflow keeps its `concurrency` block when the host has turned the flag on. The plugin simply
stops *reading* it to decide anything: blocking makes a second run for one document impossible by
construction, so there is nothing left for the flag to serialise on the plugin's behalf.

**New surface.** One field on a published response, `busy`. The shape check fired on "a field is
added to a type that is published": weighed against reusing `refused` with a reason code per entry.
The separate field wins on the count that matters — a client that ignores `busy` behaves exactly as
before, while a reason code changes the type of every existing entry.

**Written contract.** `admitWork` owes callers two things its signature cannot state: a document with
**any** unsettled run is busy, however many locales that run covers; and `busy` lists each document
once, not once per locale. AC2 and AC7 pin them.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R4 | Work for a document with an unsettled run is not queued | `bunx vitest run src/core/domain/runs/__tests__/admitWork.test.ts` | exit 0, the cases run |
| AC2 | R4 | A busy document is named once, whatever the run covers | same file, `-t "once"` | exit 0, the case runs |
| AC3 | R4 | A free document in the same request is still queued | same file, `-t "alongside"` | exit 0, the case runs |
| AC4 | R4 | A document whose runs have all settled is free again | same file, `-t "settled"` | exit 0, the case runs |
| AC5 | R4 | `POST /enqueue` names the busy documents apart from the ones it refused by rights | `bunx vitest run src/server/features/enqueue-translation/` | exit 0, the cases run |
| AC6 | R4 | `select_all` asks the record about the collection, an id list asks about those documents | same file, `-t "select_all"` | exit 0, the case runs |
| AC7 | R4 | Auto-translate queues nothing for a busy document, and the editor's save still succeeds | `bunx vitest run src/server/modules/auto-translate/` | exit 0, the cases run |
| AC8 | R4 | The merge policy is gone from the package | `grep -rE "planEnqueue\|alreadyCovered\|extendJob" src` | no match outside the deprecations log |
| AC9 | R4 | The plugin reads `enableConcurrencyControl` nowhere but where it hands it to Payload | `grep -rn "enableConcurrencyControl" src` | the only match configures the workflow |
| AC10 | R4 | On a real database a second request for a busy document is refused, and the first run still finishes | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/one-run-per-document.int.test.ts` | exit 0, the cases run |
| AC11 | — | No new type errors | `bun run check-types` | 0 errors |
| AC12 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC13 | — | No new lint findings | `bunx oxlint .` | ≤ 37 warnings, 0 errors |
| AC14 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC15 | — | Integration suites stay green on all three adapters | `apps/dev`: `bun run test:integration` ×3 | 0 failing |

The package suite's count is expected to **fall**: this step deletes `planEnqueue`, `alreadyCovered`
and `covers` together with their specs, which is most of the merge machinery's coverage. AC12 asks
for zero failures rather than a number, and the review log records the arithmetic.

## Pre-flight

Run against the tree as step 3 left it, on 2026-10-27.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1–AC7, AC10 | — | not run: nothing blocks, so every criterion fails by construction | change |
| AC8 | `grep -rE "planEnqueue\|alreadyCovered\|extendJob" src` | **FAIL** — 14 matches across the runner and its specs | change |
| AC9 | `grep -rn "enableConcurrencyControl" src` | **FAIL** — read in `PayloadJobsTaskRunner.enqueue` to feed `planEnqueue`, besides the workflow config | change |
| AC11 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC12 | `bunx vitest run` | **PASS** — 216 files, 2694 passing | invariant |
| AC13 | `bunx oxlint .` | **PASS** — 37 warnings, 0 errors | invariant |
| AC14 | `bunx turbo run build --filter=…` | **PASS** — measured at the end of step 3 | invariant |
| AC15 | `bun run test:integration` ×3 | **PASS** — SQLite 246 / 10 skipped, PostgreSQL 252 / 4, MongoDB 244 / 12 | invariant |

## Risk notes

- **Integration specs built on merging will fail, and that is the point.** `job-extend`,
  `locale-append`, `exclusive-queue` and the two `queued-before-any-ending` specs all describe a
  second request joining a live run. Each is read on its own: the ones that pin *merging* go with
  the mechanism, the ones that pin something else through merging are re-aimed. None is deleted
  quietly; the review log names every one.
- **The cost of being wrong is an editor who cannot translate.** A row stuck unsettled blocks its
  document until someone cancels. The design accepts this and names the escape hatch (the cancel
  button), but it means the liveness predicate has to be exactly right — which is why AC4 exists
  separately from AC1.
- **Two requests racing on one free document can both be admitted.** The read and the write are not
  one transaction, and the record's unique key is per `(handle, targetLng)`, not per document. The
  window is the span of one enqueue. Narrowing it further needs a lock the design did not ask for;
  recorded rather than built.

## Review log

### Verification

| AC | Command | Result |
|---|---|---|
| AC1–AC4 | `bunx vitest run src/core/domain/runs/` | **PASS** — 8 cases |
| AC5, AC6 | `bunx vitest run src/server/features/enqueue-translation/` | **PASS** — 7 new cases among them |
| AC7 | `bunx vitest run src/server/modules/auto-translate/` | **PASS** — 46 cases, 4 new |
| AC8 | `grep -rE "planEnqueue\|alreadyCovered\|extendJob" src docs` | **PASS** — no match. Three prose references survived the code: two test comments and one line in the deprecations log, all repaired |
| AC9 | `grep -rn "enableConcurrencyControl" src` | **PASS** — one match, the workflow's own `concurrency` block |
| AC10 | `apps/dev`: `… one-run-per-document.int.test.ts` | **PASS** — 5 cases |
| AC11 | `bun run check-types` | **PASS** — 0 errors |
| AC12 | `bunx vitest run` | **PASS** — 2645 passing, 0 failing (from 2694) |
| AC13 | `bunx oxlint .` | **PASS** — 37 warnings, 0 errors |
| AC14 | `bunx turbo run build --filter=…` | **PASS**; `bunx turbo run check-types` 9/9 |
| AC15 | `bun run test:integration` ×3 | **PASS** — SQLite 242 / 10 skipped, PostgreSQL 248 / 4, MongoDB 240 / 12 (from 246 / 252 / 244) |

**The arithmetic the contract asked for.** The package suite lost 72 checks and gained 23. The
Payload Jobs runner alone is **1090 lines lighter against 52 added**. What went: `planEnqueue`,
`pickHost`, `alreadyCovered`, `covers`, `extendJob` and their four spec files, plus eight cases in
`PayloadJobsTaskRunner.test.ts` that described extending a live job. What arrived: `admitWork` with
eight cases, seven on the enqueue route, four on the auto-translate hook, two on the store and two
pinning that the runner no longer looks at the job table before queuing.

The integration suites lost three files — `job-extend`, `locale-append` and `legacy-row-upgrade` —
and one case of `exclusive-queue`. Each is named under Deviations.

### Mutations

Fifteen mutations, each applied to the implementation alone, the affected specs run, and the file
restored from a copy with the restore verified by comparison.

| | What was broken | Went red |
|---|---|---|
| P1 | a busy document is admitted after all | 8 checks, across the policy and the route |
| P2 | a busy document is named once per locale | names a busy document once |
| P3 | the collection is dropped from the address | keeps two collections apart |
| P4 | the handler asks about documents the caller may not change | asks only about the documents the caller may change |
| P5 | busy and refused share one field again | 3 checks |
| P6 | the queued count stops matching what was admitted | 2 checks |
| P7 | `select_all` asks about documents rather than the collection | asks about the whole collection |
| P8 | auto-translate queues over a run already under way | 2 checks |
| P9b | auto-translate throws instead of skipping | leaves the editor's save alone, even inside their transaction |
| P10b | the runner looks at the job table before queuing | reads no job at all before queuing one |
| P11 | the live read narrows by document but not by settlement | asks by both halves of the key and the absence of a settlement |
| P12 | an empty document list still asks the database | asks nothing at all when no document was named |

**One mutation did not bite, and it was a real finding.** P9 made the auto-translate hook *throw*
on a busy document, and nothing went red: the check ran without a transaction in scope, where
`swallowOrThrow` swallows and the save succeeds either way. The guarantee that matters is the one
inside the editor's transaction, where a throw rolls their save back. The check now runs with a
`transactionID` and also asserts nothing was logged as an error; P9b then reddened it.

### The review passes

**Complexity.** Scenario: *the rule for whether a document may take new work changes* — which is
what this step is. Before, that rule lived in five units inside the Payload Jobs runner
(`planEnqueue`, `pickHost`, `alreadyCovered`, `covers`, `extendJob`), every one of them reading the
shape of a stored job row, and it was unavailable to the sync runner or to any runner a host writes.
After, it is one pure function with two callers. CHANGE 5 → 1. READ falls with it: the rule no
longer requires knowing how a job row stores its locale list. STATE: `EnqueuePlan` admitted five
interdependent fields (`host`, `append`, `queue`, `covered`, `coveredBy`, where `host: null` with a
non-null `coveredBy` meant something specific); `Admission` admits two, and every state it admits is
one the system produces.

**Abstraction.** One finding, applied: the policy's shape was called `DocumentRef`, and
`core/domain/translation-providers/` already exports a `DocumentRef` — same layer, same name,
*different shape* (`{ collection, id }` against `{ collectionSlug, collectionId }`). Renamed to
`OnADocument`, which is what `shared/access/authorised.ts` already calls that exact shape, so the
package now has one name for it. The alias `RunInFlight` went with it: it was `DocumentRef` under
another name, and the parameter's own docblock says what the list is. The barrel narrowed to
`admitWork` alone — nothing outside the module names the types.

**Comments.** Every block in the diff was judged. Three prose references to the deleted mechanism
were found outside the code AC8 greps for and repaired: two test comments explaining why a job row
can carry two shapes (rewritten to name the release rather than the function), and one `Code refs`
line in `docs/DEPRECATIONS.md` pointing at `planEnqueue.ts`, removed. Everything added in this step
says why rather than what, and the heaviest of them — `admitWork`'s docblock — carries the Payload
behaviour that makes blocking necessary rather than merely tidy.

### Deviations from the contract

1. **Three integration files were deleted, not re-aimed.** `job-extend.int.test.ts` (4 cases) and
   `locale-append.int.test.ts` (1 case) describe appending a locale to a live run, which no longer
   exists. `legacy-row-upgrade.int.test.ts` (3 cases) describes appending to a *pre-1.0* row; its
   third case, which looked like it was about the status route, passes now for a reason that has
   nothing to do with the legacy row — the panel reads the run record, which this step does not
   touch — so keeping it would have been keeping a check that no longer asks its own question.
2. **One case of `exclusive-queue.int.test.ts` was deleted.** "Holds a second job for the same
   document, then runs it and loses nothing" cannot arise: there is never a second job for one
   document to hold. The file's other case stays, and its header now says why the first one went.
3. **`RequestShape` moved to `store/types.ts`.** It lived in `planEnqueue.ts` and outlived it; it
   describes the header a job row stores, which is what `store/` is for.

### Findings carried forward

- **Two requests racing on one free document can both be admitted.** Recorded in the contract before
  the code existed: the read and the write are not one transaction, and the record's unique key is
  per `(handle, targetLng)`, not per document. The window is one enqueue long. Closing it needs a
  lock, which the design did not ask for.
- **Re-queueing after a cancel still asks for every locale.** The design says the re-queue should be
  composed from what is still owed, so a locale already delivered is not paid for twice. That is the
  admin composing a request from the status panel — client work, and #48's — so nothing here does
  it. The server is ready for it: the panel already answers which locales are delivered.
- **The deprecation `jobs-task-shape` lost a code reference but not its substance.** `ownJobs()` and
  `normalizeJobLocales` still carry the fallback for jobs queued as a bare task; step 6 is where
  that is decided.
