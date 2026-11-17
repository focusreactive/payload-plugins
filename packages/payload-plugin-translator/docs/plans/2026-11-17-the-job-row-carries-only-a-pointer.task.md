# The job row carries only a pointer

Finishes what `./2026-10-27-the-pointer-input.task.md` set up: that step isolated the pre-1.0
compatibility into one folder with two call sites so that dropping it would be a deletion rather
than a project (its D4 and D6). This is that deletion.

Every `file:line` below was read on 2026-11-17 at `6a83f4d5`.

## Task restatement

A `payload-jobs` row queued before 1.0 carries the whole run in `input`; a row queued by 1.0 carries
only `{ handle, locales }`. `payload-jobs-runner/legacy/` is the code that understands the old shape
and rewrites such a row into the new one on first encounter.

Remove it. The point is not the ~290 lines: it is that `PayloadJob.input` is typed
`Record<string, unknown>` **because** two shapes are possible, and `store/types.ts:24-26` says so in
as many words. With one shape left, the type can state it.

The cost is accepted: a job queued on 0.18.x and not finished before the upgrade will not run.

## What already exists — platform · installed · project · verdict

- **Platform.** Payload gives a job row either a `workflowSlug` or a `taskSlug`, never both
  (`node_modules/payload/dist/queues/operations/runJobs/index.js:247-248`). Tasks run *inside* a
  workflow get no row of their own; they are invoked on the parent job. So a row carrying
  `taskSlug` is a standalone task job — which this plugin has not queued since 1.0, its one queue
  call being `queueWorkflow` (`PayloadJobsTaskRunner.ts:132`).
- **Installed.** Nothing added.
- **Project.** The error-log idiom this change needs already exists twice in the file it edits
  (`PayloadJobsRunnerProvider.ts:252,263`): `payload.logger?.error?.({ err, msg: "[translator] …" })`.
  The per-locale task path already fails loudly on a run it cannot find —
  `wireTranslateRunner.ts:105` throws the named `RunRecordMissing`.
- **Verdict.** Nothing new is designed. One branch is narrowed, one is deleted, one log line is
  added in the house shape.

## Decisions

**D1 — `PayloadJob.input` becomes `StoredWorkflowInput`, still optional.**
Chosen: `input?: StoredWorkflowInput`. Lost: `input: StoredWorkflowInput` (required), and the zero
option of leaving `Record<string, unknown>`.

Required loses because the value comes out of a database row, which is a boundary: nothing
type-checks what is already stored, and `pointerOf` exists to validate it (`store/pointerOf.ts:8`).
A required type would make the branch this task is here to write — the row whose input does not
parse — read as unreachable, which is exactly the misreading the log line is meant to prevent.
Leaving it open loses because it is the thing being removed.

`JobLogEntry.input` stays `Record<string, unknown>` (`store/types.ts:18`): a log entry records
whatever a task was given, and `jobLog.ts:6` reads one field out of it. Different field, different
question, untouched.

**D2 — a workflow job with no pointer is logged against its id and skipped.**
Decided by the owner. The alternatives and why they lost: returning silently marks the job complete,
so a host's queued translation disappears with no row in `translator-runs` and no line in the log;
throwing spends the retry budget on a condition no retry can fix, and only then marks it failed.

The line follows the file's own shape and names the job:

```
req.payload.logger?.error?.({
  jobId: job.id,
  msg: "[translator] a queued translation names no run and was skipped; it was queued before 1.0, or its input is damaged",
});
```

**D3 — `ownJobs()` stops matching `taskSlug`.**
Chosen: `ownJobs()` returns `{ workflowSlug: { equals: workflowName } }`. Lost: keeping the `or`.

It cites the platform fact above: with the plugin queueing only workflows, that branch can match
nothing except a row queued before 1.0. It is also the code reference the ledger gives for
`jobs-per-locale-task-shape` (`docs/DEPRECATIONS.md:96`), so leaving it in means that entry cannot
honestly move to `removed`.

What it costs: `stop`, `run` and `reclaimStaleJobs` stop reaching pre-1.0 standalone task rows.
Those rows are left where they are. Payload will still try to run one, because the task slug stays
registered — and that path already ends in `RunRecordMissing`, loudly, which is the outcome D2 is
arranging for the workflow path.

**D4 — no new guard on the per-locale task handler.**
Considered and rejected, because the zero option already holds: an old task row reaches
`translateOneLocale` with no `handle`, the run lookup finds nothing, and
`wireTranslateRunner.ts:105` throws `RunRecordMissing`. Adding a second check would duplicate a
failure the code already reports by name.

**D5 — `reclaimAndAdopt` becomes `reclaim`.**
Half of what it did is being deleted; a name describing both halves would be false. Its doc line
("Both halves are best-effort…") narrows with it.

**New surface.** None. The shape check fired once — a type changing on a field read across the
runner — and two shapes were weighed under D1.

**Written contract.** None. Nothing here owes a caller something its signature cannot state.

**Escalate?** No. One module, no new seam, no data-model change: the stored shape is already the
pointer and has been since 1.0; this removes the reader of what came before.

## Scope beyond the brief

Two items the brief did not name, found in Phase 1:

- `apps/dev/src/integration/translator/legacy-job-adoption.int.test.ts` (156 lines, 7 cases) exists
  only to prove adoption works. It goes with the thing it proves.
- `ownJobs()` — D3 above.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | removal | The compatibility folder is gone | `test ! -d src/server/modules/task-runner/payload-jobs-runner/legacy` | exit 0 |
| AC2 | removal | Nothing anywhere still names adoption or its query | `grep -rn "adoptLegacyJob\|readLegacyRun\|LegacyRunSchema\|LegacyInputSchema\|withoutAHandle\|adoptQueuedBeforeTheUpgrade" src ../../apps/dev/src` | no match |
| AC3 | the point | A job row's `input` is typed as the pointer | `grep -n "input?: StoredWorkflowInput" src/server/modules/task-runner/payload-jobs-runner/store/types.ts` | one match, and no `Record<string, unknown>` on `PayloadJob.input` |
| AC4 | D2 | A workflow job carrying no pointer is logged against its id and the handler returns without running a locale | `bunx vitest run src/server/modules/task-runner/payload-jobs-runner/__tests__/PayloadJobsRunnerProvider.test.ts -t "names no run"` | exit 0; the case asserts the logger was called with the job id and that no locale task ran |
| AC5 | D2 — **negative** | That job is not reported as translated: no locale is settled `delivered` | same file and case | exit 0; `report` received no `delivered` event |
| AC6 | D3 | The runner claims only workflow rows | `bunx vitest run src/server/modules/task-runner/payload-jobs-runner/__tests__/PayloadJobsTaskRunner.cancel.test.ts` and `grep -n "taskSlug" src/server/modules/task-runner/payload-jobs-runner/PayloadJobsTaskRunner.ts` | exit 0; no `taskSlug` in `ownJobs()` |
| AC7 | D4 — **negative** | The per-locale path still reports a run it cannot find, rather than passing | `bunx vitest run src/server/features/translate-document -t "RunRecordMissing"` or the suite covering `wireTranslateRunner.ts:105` | exit 0, the case runs |
| AC8 | ledger | `jobs-input-collection-field` and `jobs-per-locale-task-shape` read `removed`, and `the-strategy-leaves-the-stored-run` is closed by this change | `grep -n -A3 "^### jobs-input-collection-field\|^### jobs-per-locale-task-shape\|^### the-strategy-leaves-the-stored-run" docs/DEPRECATIONS.md` | each shows `**Status:** removed` with this change's date |
| AC9 | ledger | Text that was **wrong** is struck through, not deleted; text that merely went **stale** because of this change is rewritten into the past tense | `grep -c "~~" docs/DEPRECATIONS.md`, and read the three entries | the old text is still present inside `~~…~~`, and each strike has a correction beneath it naming what was wrong |
| AC10 | — | No new type errors | `bun run check-types` | 0 errors |
| AC11 | — | The package suite stays green | `bunx vitest run` | 222 files, ≥ 2626 passed, 9 skipped, 0 failing |
| AC12 | — | No new lint findings | `bunx oxlint .` | ≤ 33 warnings, 0 errors |
| AC13 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC14 | — | The sandbox suite stays green against a real Payload boot | `apps/dev`: `bun run test:integration:sqlite` | 61 files passed, 4 skipped; 241 passed, 7 skipped; 0 failing |

## Pre-flight — each check run against the untouched tree, 2026-11-17

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — the folder exists, 4 files | change |
| AC2 | **FAIL** — matches in `PayloadJobsRunnerProvider.ts`, `store/index.ts`, `store/jobsWhere.ts`, the folder itself, and the sandbox integration test | change |
| AC3 | **FAIL** — `store/types.ts:41` reads `input?: Record<string, unknown>` | change |
| AC4, AC5 | not run — the case does not exist; today the handler adopts instead of skipping | change |
| AC6 | **FAIL** — `PayloadJobsTaskRunner.ts:231-236` matches `taskSlug` | change |
| AC7 | expected PASS — the throw at `wireTranslateRunner.ts:105` is already there; confirmed in Phase 5 as an invariant | invariant |
| AC8 | **FAIL** — all three entries read `live` / a shim | change |
| AC9 | **FAIL** — no `~~` in the ledger | change |
| AC10 | **PASS** — 0 errors | invariant |
| AC11 | **PASS** — 223 files, 2638 passed, 9 skipped | invariant |
| AC12 | **PASS** — 33 warnings, 0 errors | invariant |
| AC13 | **PASS** — exit 0 | invariant |
| AC14 | **PASS** — 62 files passed, 4 skipped; 248 passed, 7 skipped | invariant |

The two suite counts drop by exactly what is being deleted: 12 unit cases in
`legacy/__tests__/readLegacyRun.test.ts`, 7 sandbox cases in `legacy-job-adoption.int.test.ts`.
AC11's floor is stated as "≥" because AC4 and AC5 add cases.

## Risk

**High.** It is a deletion on the path that carries a host's queued work, its failure mode is
someone's translation not happening, and it narrows a type read throughout the runner. Consequences
for this run: a test is required rather than optional (AC4, AC5), the regression sweep in Phase 4
names what was searched and how many call sites were read, and Phase 5 uses three review angles
rather than one.

### Risk notes

- **A host that upgrades with a full queue loses that queue's work.** That is the accepted cost, and
  the only mitigation is telling them: the commit's `BREAKING CHANGE:` footer says to let the queue
  drain before upgrading to 1.0. The README belongs to the owner — if a line is wanted there, it is
  proposed, not written.
- **`modules/runs/__tests__/store.test.ts:100`** has a case titled for "an adopted run". The case is
  about SQLite handing back a deleted row's id and does not depend on adoption, but its wording goes
  stale. Rename it, change nothing else.
- **Orphaned pre-1.0 rows stay in the queue** after D3. They are not deleted by this change — doing
  so would be a data migration nobody asked for.

### How the ledger was edited, and why the two treatments differ

Four blocks ended up struck rather than the two the brief named, and one block that a strict reading
would have struck was rewritten instead. The rule applied:

- **Wrong when written → struck**, with a correction beneath. That is the two pasted paragraphs in
  `jobs-input-collection-field`, and in `the-strategy-leaves-the-stored-run` its old `Status` line
  and its old removal condition, which named `store/runTargets.ts` — a file that had already ceased
  to exist when the line was written.
- **True when written, made stale by this change → rewritten into the past tense**, with a new line
  saying what happens now. That is the behavioural block in `the-strategy-leaves-the-stored-run`,
  whose three-row table had a column headed "What it does now". Striking it was rejected on a
  practical ground: `~~` through a markdown table leaves it unreadable, and the table is the only
  record of how those rows behaved in the window it describes. The same treatment was given to
  "Where the fallback lives now" in the other two entries.

## Decisions by the owner

- 2026-11-17 — a workflow job carrying no pointer is logged against its id and skipped, rather than
  skipped silently or thrown. Silence loses a host's queued translation with no trace anywhere; a
  throw spends the retry budget on a condition no retry can fix. Recorded above as D2.
- 2026-11-17 — `ownJobs()` drops its `taskSlug` branch in this change rather than later, so that the
  ledger entry naming it can move to `removed` without a caveat. Recorded above as D3.
- 2026-11-17 — the work lands on the branch already in progress rather than a fresh one, keeping the
  major's remaining steps on one branch and under one review.
- 2026-11-17 — the upgrade warning lives in the commit's `BREAKING CHANGE:` footer only, which the
  changelog is built from. The README is not edited and no wording is proposed for it.
