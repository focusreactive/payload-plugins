Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #6

# Step 6 — the job carries a pointer

## Requirements / Task restatement

The Payload Jobs runner still stores the whole run in its job row: collection, document, source
locale, per-locale filters, publish flag and requester. Every one of those now also lives in
`translator-runs`, which is the source of truth — so the job row states them a second time, and the
readers that parse them are the 468 lines nobody can remove.

This step empties the job row down to a pointer. The queue carries the run's handle and its locale
list; each per-locale task carries the handle and its locale. Everything else the **plugin's**
handler reads from its own record, so the runner never looks at the table and never parses a run.

A job queued before the upgrade is **adopted** rather than read in parallel: on first encounter the
plugin writes its rows and the job is thereafter indistinguishable from a new one. That is one file
and two call sites, which is what makes dropping the compatibility a deletion rather than a project.

Covers R8 of the design, and finishes D4.

## What already exists — platform · installed · project · verdict

- **Platform.** A job's input fields become real columns, so `input.handle` is queryable the way
  `input.collection_slug` already is (`store/jobsWhere.ts`). No JSON traversal is needed.
- **Installed.** Nothing new is added.
- **Project.** `report` is already the one road from the runner to the plugin, and `recordQueued` is
  already create-if-absent — which is exactly what adoption needs, replayed rather than invented.
- **Verdict.** Nothing new is designed. One thing is renamed rather than added: what a report names.

## Decisions

**D1 — the plugin mints the handle; the rows are written before the job is queued.**
Chosen: `enqueue` mints a handle, reports `queued` for each locale — which writes the rows — and only
then queues the workflow carrying that handle. Lost: keeping `handle = String(job.id)`.

The reason is a race, not tidiness. If the job existed first, a cron could pick it up before the rows
were written, and a handler that reads the table would find nothing, translate nothing and complete —
leaving rows that are written afterwards and never settled, which under step 4's rule blocks the
document for good. Rows-first has a failure of its own — a `queueWorkflow` that throws leaves rows
with no job — but that failure is loud (the enqueue rejects), visible (the panel shows the locales as
pending) and already has an escape hatch (cancel). A race that silently does nothing has none of
those.

It also closes a hazard the port documents today: SQLite reuses a deleted row's id, so a handle kept
across a cancellation could later name another run. A minted handle cannot.

**D2 — a report names the run and the locale; only `queued` describes the work.**
`report(payload, ref: RunRef, event, scope?)` with `RunRef = { handle, targetLng }`, and
`TaskEvent`'s `queued` variant carrying the work. Lost: `EnqueueAssignment` as every report's first
argument. After this step the runner *cannot* describe the work at terminal time — it does not know
the document any more — so a signature demanding it would force the runner to read the table, which
is the one thing this design keeps it out of. `EnqueueAssignment` stays as the **answer** to
`enqueue`, where the runner does know everything.

**D3 — `TaskHandlerInput` is `{ handle, targetLng, previousAttempts }`.**
The runner knows nothing else to give. The plugin's handler reads the row and builds what
`translateDocument` needs. `TaskRunnerContext.collections` goes with it: its only two uses built the
legacy `collection` field this step stops writing.

**D4 — adoption lives with the runner whose rows they are.**
`payload-jobs-runner/legacy/adoptLegacyJob.ts`, not `modules/runs/legacy/` as the design sketched. A
run record is runner-agnostic; a `payload-jobs` row written before 1.0 is not. The file carries the
old readers with it, so deleting the file deletes the compatibility.

Adoption writes nothing itself: it replays `report(queued)` for each locale the old job names, which
is the same road a new run takes, and `recordQueued` leaves a row that is already there alone — so
adopting twice is adopting once. Then it stamps `handle` and `target_lngs` onto the job's input, and
the job is new-shaped from that moment.

**D5 — an adopted job's handle is its own id.**
The only name it has ever had: the enqueue answer gave it, a host may have stored it, and the cancel
route still takes it. Minting a fresh one would strand every handle a host is holding.

**D6 — the legacy deprecations are isolated, not removed.**
`jobs-input-collection-field`, `jobs-per-locale-task-shape` and `the-strategy-leaves-the-stored-run`
stay `live`. Step 5 deferred the first of them here on the grounds that removing the read fallback
would strand a job queued before 0.3.0 — and that is still true, because R8 says such a job must keep
running. What changes is that all three now live in one file with two call sites. Their ledger entries
say so, and say what deleting that file costs.

**New surface.** `RunRef`, published, because a runner author names it. The shape check fired on an
exported function changing a parameter's type: two shapes were weighed — `RunRef` as a new type, and
narrowing `EnqueueAssignment` itself to the two fields. The separate type wins because
`EnqueueAssignment` is still answered in full by `enqueue`, and one type cannot be two widths.

**Written contract.** Adoption owes callers two things its signature cannot state: it is idempotent,
and a job it has adopted is never adopted again. AC5 and AC6 pin them.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R8 | A queued job's input carries the handle and the locale list, and nothing else | `bunx vitest run src/server/modules/task-runner/payload-jobs-runner/__tests__/jobInputFields.test.ts` | exit 0, the snapshot matches |
| AC2 | R8 | The rows exist before the job does | `bunx vitest run …/PayloadJobsTaskRunner.test.ts -t "before"` | exit 0, the case runs |
| AC3 | R8 | The plugin's handler is given the handle and the locale, and reads the rest from the record | `bunx vitest run src/server/features/translate-document/__tests__/readsTheRun.test.ts` | exit 0, the cases run |
| AC4 | R8 | A terminal report names the run and the locale, and the plugin finds the document itself | `bunx vitest run src/server/features/translate-document/__tests__/recordTheRun.test.ts` | exit 0, the cases run |
| AC5 | R8 | A job queued before the upgrade is adopted, and then runs | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/legacy-job-adoption.int.test.ts` | exit 0, the cases run |
| AC6 | R8 | Adopting the same job twice leaves one row per locale | same file, `-t "twice"` | exit 0, the case runs |
| AC7 | R8 | A job queued before the upgrade is adopted at boot, and also when met without one | same file, `-t "independently"` | exit 0, the cases run |
| AC8 | R8 | Dropping the compatibility is one file and its call sites | `grep -rln "LegacyRunSchema\|LegacyCollectionSchema\|target_lngs" src` | only the legacy folder and the ledger |
| AC9 | R8 | `TaskRunnerContext.collections` is gone | `grep -rn "context.collections\|collections:" src/server/modules/task-runner` | no match on the context |
| AC10 | — | No new type errors | `bun run check-types` | 0 errors |
| AC11 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC12 | — | No new lint findings | `bunx oxlint .` | ≤ 35 warnings, 0 errors |
| AC13 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC14 | — | Integration suites stay green on all three adapters | `apps/dev`: `bun run test:integration` ×3 | 0 failing |
| AC15 | — | The two integration checks step 3 skipped are answered | `apps/dev`: `… status-reads-are-bounded.int.test.ts` and `… legacy-job-adoption.int.test.ts` | exit 0, nothing skipped in either |

## Pre-flight

Run against the tree as step 5 left it, on 2026-10-27.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | `bunx vitest run …/jobInputFields.test.ts` | **PASS** today against a baseline of the *full* run shape — which is the before-state AC1 changes | change |
| AC2–AC7 | — | not run: the pointer and adoption do not exist | change |
| AC8 | `grep -rln "LegacyRunSchema\|LegacyCollectionSchema\|target_lngs" src` | **FAIL** — 9 files | change |
| AC9 | `grep -rn "collections" src/server/modules/task-runner` | **FAIL** — on `TaskRunnerContext` and both providers | change |
| AC10 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC11 | `bunx vitest run` | **PASS** — 2593 passing, 9 skipped | invariant |
| AC12 | `bunx oxlint .` | **PASS** — 35 warnings, 0 errors | invariant |
| AC13 | `bunx turbo run build --filter=…` | **PASS** — measured at the end of step 5 | invariant |
| AC14 | `bun run test:integration` ×3 | **PASS** — SQLite 240 / 10 skipped, PostgreSQL 246 / 4, MongoDB 238 / 12 | invariant |
| AC15 | `… status-reads-are-bounded.int.test.ts` | **PASS with 2 skipped** — the two cases step 3 parked for this step | change |

## Risk notes

- **This step can strand work that is already queued.** Everything about adoption is about not doing
  that. The integration spec seeds a real pre-1.0 job row and runs it, on all three adapters, which
  is the only honest way to check it.
- **Rows before the job is a deliberate inversion of the failure.** A failed queue now leaves
  pending rows instead of a silent no-op. Recorded under D1; the escape hatch is the cancel button.
- **The per-terminal-event read is new cost.** The host's lifecycle callbacks name a document, and
  after this step the runner cannot. One read per settlement, which the design's own cost model
  budgeted.

## Review log

### Verification

| AC | Command | Result |
|---|---|---|
| AC1 | `bunx vitest run …/jobInputFields.test.ts` | **PASS** — 5 cases; the baseline is now `handle` + `locales` on the workflow and `handle` + `target_lng` on the task, and one case lists twelve facts a job row may no longer state |
| AC2 | `bunx vitest run …/PayloadJobsTaskRunner.test.ts` | **PASS** — 30 cases, "writes the record before the job exists" among them |
| AC3 | `bunx vitest run …/readsTheRun.test.ts` | **PASS** — 11 cases |
| AC4 | `bunx vitest run …/recordTheRun.test.ts` | **PASS** — 14 cases |
| AC5–AC7 | `apps/dev`: `… legacy-job-adoption.int.test.ts` | **PASS** — 7 cases, on all three adapters |
| AC8 | `grep -rln "LegacyRunSchema\|target_lngs" src` | **PASS** — `legacy/legacyInput.ts` and its spec |
| AC9 | `grep -rn "collections" src/server/modules/task-runner` | **PASS** — two prose mentions of the plugin's own option, nothing on the context |
| AC10 | `bun run check-types` | **PASS** — 0 errors; `bunx turbo run check-types` 9/9 |
| AC11 | `bunx vitest run` | **PASS** — 2519 passing, 9 skipped, 0 failing (from 2593) |
| AC12 | `bunx oxlint .` | **PASS** — 35 warnings, 0 errors |
| AC13 | `bunx turbo run build --filter=…` | **PASS** |
| AC14 | `bun run test:integration` ×3 | **PASS** — SQLite 247 / 8 skipped, PostgreSQL 253 / 2, MongoDB 245 / 10 |
| AC15 | — | **answered, not restored** — see Deviations |

### Mutations

Twelve mutations, each applied to the implementation alone, the affected specs run, and the file
restored from a copy with the restore verified by comparison.

| | What was broken | Went red |
|---|---|---|
| R1 | the record is written after the job is queued | writes the record before the job exists |
| R2 | the job row states a fact about the run again | 2 checks |
| R3 | the handler is handed a locale it was not asked for | hands on the handle and the locale the job row names |
| R4 | the plugin stops reading the run out of its own record | 2 checks |
| R5 | the requester is taken from the caller rather than from the run | writes under the rights of whoever asked |
| R6 | an unparseable stored filter is read as naming no filter | drops a filter entry the parser rejects |
| R7 | adoption invents a run for a row that says too little | 2 checks |
| R8 | the strategy a pre-1.0 run shared stops becoming the drift rule | turns the strategy into the drift rule |
| R9 | a reused handle silently keeps the older run's row | replaces a row whose key names a different document |
| R10 | the stamp and the translation stop naming the same locale | 2 checks |
| R11 | adoption never stamps the pointer onto the job | carries its pointer afterwards · is cancellable by its own id |
| R12 | the boot backfill is removed | 6 of the 7 adoption cases |

R11 and R12 were run against the integration spec on a real database, rebuilding the package each
time, because adoption's two call sites only exist there.

### The bug the integration suite found that no unit check could

Adopting a pre-1.0 job names the run by the job's own id (D5), and **SQL hands a deleted row's id
back out**. The sequence that breaks: a new run is cancelled, its job row is deleted, a pre-upgrade
job is adopted and lands on the freed id — and `recordQueued`, whose rule since step 2 has been
"a key already recorded keeps the row it has", left the cancelled run's row in place and wrote
nothing. The adopted locale then had no row at all, and would have failed with `RunRecordMissing`
the moment it ran.

It surfaced as one integration case failing only when the whole file ran, and passing alone — which
is exactly the shape of a test that has found something rather than one that is flaky. The fix is in
the rule, not in adoption: a row whose key names a **different document** is history of a run whose
job is gone, and is replaced. A unit check now pins it, and `isAbout` says why in one line.

The port already documented this hazard for callers ("SQLite reuses a deleted row's id, so a handle
kept across a cancellation can later name another run"); what was new is that the plugin's own record
was exposed to it.

### The review passes

**Complexity.** Scenario taken from history: *a fact about a run changes shape*, which is what
`targets`, `strategy` and `collection` each did. Before: the fact lived in the job input, so it
needed a schema change, a reader, a fallback for rows already queued, and a migration note — and
those fallbacks accumulated across six files, which is why nobody could remove them. After: the job
input cannot carry a fact at all, so there is nothing to change shape; the record's column list and
its one migration are the whole of it. CHANGE for that scenario goes from 6 to 2, and the fallbacks
that existed are now in one folder, reached from two lines.

**Abstraction.** Two findings, applied. `withLegacyCollection` had no caller once the task's input
stopped naming a collection — removed with its docblock. `store/` shrank from eleven files to six:
`readCollectionRef`, `readRequester`, `runTargets`, `assignmentOf` and `normalizeJob` either moved
into `legacy/` as one reader or went entirely, and `jobLog.ts` is what survived of `normalizeJob`.
`RunRef` was weighed against narrowing `EnqueueAssignment` itself: the separate type wins because
`enqueue` still answers in full, and one type cannot be two widths.

**Comments.** Every block in the diff was judged. The legacy folder's two headers are the load-
bearing ones — they say what deleting the folder costs, which is the fact a future reader needs and
cannot derive. Three comments were repaired rather than written: the concurrency key's reason (it
keys a run now, not a document), the task fixture's docblock (it described `pickHost`, which is
gone), and the ledger's two `Code refs` lists.

### Deviations from the contract

1. **AC15 is answered, not satisfied as written.** The two cases step 3 parked asserted that the
   *panels read legacy job rows*. They never will again — a pre-upgrade job answers the panels by
   being adopted, which is what `legacy-job-adoption.int.test.ts` checks in seven cases, two of them
   on the panel and the cancel route. The parked cases were removed rather than restored, with the
   legacy seed helper they used.
2. **Adoption lives in the runner, not in `modules/runs/legacy/` (D4).** Decided before the code was
   written: a run record is runner-agnostic, a `payload-jobs` row is not.
3. **The three legacy deprecations stay `live` (D6).** They are now isolated to one folder rather
   than removed, because R8 requires a job queued before the upgrade to keep running. The ledger
   entries say where the fallback lives and what deleting it costs.
4. **`RequestShape` is private to the runner again.** Step 4 moved it into `store/types.ts` because
   it described the job row's header; it no longer does, so it went back beside the code that groups
   requests by it.

### Findings carried forward

- **An adopted run keeps its job's id as its handle, and new runs do not.** Two naming schemes
  coexist by design (D5), and the one that is a reused integer is the one exposed to id recycling.
  The rule above handles it; it is worth knowing when reading a database by hand.
- **A failed `queueWorkflow` now leaves rows with no job.** The deliberate inversion recorded in D1:
  loud, visible on the panel, and cancellable, against a silent race that was none of those.
- **One read per settlement is new cost**, because the host's callbacks name a document the runner
  no longer knows. Budgeted by the design; worth watching on a many-locale document.
