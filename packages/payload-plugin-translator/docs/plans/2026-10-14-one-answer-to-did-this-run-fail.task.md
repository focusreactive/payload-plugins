# One answer to "did this run fail"

Follows: 2026-10-14-the-panel-shows-what-is-happening.task.md

## Requirements / Task restatement

Four defects found by five audits over this branch. Three are real behaviour; the fourth is a
check that cannot fail.

1. **The status an editor sees and the window that ages failures out read different fields.**
   `getJobStatus` (`store/normalizeJob.ts:10`) answers `failed` on `job.error`; `settledSince`
   (`PayloadJobsTaskRunner.ts:59`) decides "gave up" on `hasError`. Payload writes them differently:
   `handleWorkflowError.js:53-55` falls through its `if (!hasFinalError)` branch — that branch only
   adjusts `waitUntil` — and reaches `updateJob({ error: errorJSON, hasError: hasFinalError })`. So
   `error` is written on **every** failed attempt, `hasError` only on a final give-up.
2. **`findByCollection(slug, [])` answers with the whole collection** under the Payload runner
   (`PayloadJobsTaskRunner.ts:297`, `documentIds?.length`), and with nothing under the sync runner
   (`SyncTaskRunner.ts:105`, `documentIds`).
3. **`resolveSettings` accepts any number as `failedWindowMs`** (`settings.ts:80`).
4. **The invariant that forbids defect 2 cannot fail.**

### Correction to the original task description

The description said the shared conformance suite is not run for `PayloadJobsTaskRunner`. **That is
wrong.** `apps/dev/src/integration/translator/task-runner-contract.int.test.ts` already calls
`assertTaskRunnerContract("PayloadJobsTaskRunner", …)` against a real Payload, on all three
adapters. The actual defect is narrower and worse: the case `"answers about no documents, not about
all of them"` (`TaskRunner.invariants.ts:143`) sits inside `describe("an empty request is answered,
not refused")`, where nothing has been enqueued. `findByCollection(SLUG, [])` therefore returns `[]`
for every implementation — including one that does nothing. The obligation is written down and
**green for both runners for the wrong reason**.

## What already exists — platform · installed · project · verdict

- **Project.** `PayloadJobsRunnerProvider.ts:88` already validates a millisecond setting exactly as
  defect 3 needs: `if (!Number.isFinite(staleJobTimeoutMs) || staleJobTimeoutMs <= 0) throw new
  TranslatorConfigError(...)`. `TranslatorConfigError` lives at `core/errors/TranslatorConfigError.ts`
  and is deliberately not exported from `src/index.ts`.
- **Project.** The shared conformance suite and its two call sites already exist and already run on
  three adapters. Nothing new is needed to reach both runners.
- **Verdict.** No new file, no new dependency, no new abstraction.

## Decisions

### D1 — `getJobStatus` answers `failed` on `hasError`

**Chosen:** `if (job.hasError) return "failed";` in place of `if (job.error)`.

**What lost, and why:**

- `if (job.hasError && job.error)` — the second conjunct can never be false. Every site that sets
  `hasError: true` writes `error` in the same call (`handleTaskError.js:59` and `:112`,
  `handleWorkflowError.js:54-55`), and `clearPickerBlockers` clears both together
  (`PayloadJobsTaskRunner.ts`). A conjunct that cannot discriminate is noise.
- **Move the window to `error` instead of moving the status to `hasError`.** Lost on a requirement
  already settled: `excludeGivenUpBefore`'s docblock states *"Runs still in flight are kept however
  old"*. Keying the window on `error` would drop rows that are still retrying — hiding live work,
  which is the opposite of what the panel is for.

**The constraint it cites:** `node_modules/payload/dist/queues/errors/handleWorkflowError.js:53-55`,
read in the installed version.

**What this changes for readers of `Task.status`** — 11 consumers, 4 affected, all only for a run
**between** attempts:

| Consumer | Before | After |
|---|---|---|
| `useDocumentTranslation.ts:51` (polling) | `failed` → polling stops, panel freezes until reload | `pending` → polling continues |
| `get-document-status/model.ts:89`, `get-collection-status/handler.ts:50` | `failed` | `pending` |
| `statusRows.ts:94` | shows the attempt's error message | **shows nothing** — a real loss, accepted |
| `cancel-by-collection:35`, `stillOwed.ts:10`, `SyncRunnerProvider.ts:29` | unaffected — they read `running` / `!== completed`, and the sync runner sets status directly | unchanged |

### D2 — the vacuous invariant moves to where rows exist, rather than a new check elsewhere

**Chosen:** move `"answers about no documents, not about all of them"` out of the empty-request
block and into `describe("findByCollection finds tasks for a collection")`
(`TaskRunner.invariants.ts:439`), enqueueing a row for `SLUG` first — the idiom every sibling case
there already uses (`documentForThisCheck(n)`).

**What lost, and why:** adding a case to `PayloadJobsTaskRunner.test.ts` against the mock Payload.
It lost twice: it would cover one runner in one adapter-free unit test where the shared suite covers
both runners on three adapters, and it would leave the vacuous case in place, still unable to fail.

**The constraint it cites:** `apps/dev/src/integration/translator/task-runner-contract.int.test.ts`
already wires the suite to `PayloadJobsTaskRunner`.

### D3 — `failedWindowMs` is validated where it is resolved, and zero stays legal

**Chosen:** in `resolveSettings`, `!Number.isFinite(ms) || ms < 0` → `TranslatorConfigError`,
worded like the `staleJobTimeoutMs` precedent.

**What lost, and why:** `<= 0`, matching that precedent exactly. It lost to a decision already
recorded in this package: `settings.test.ts` carries `"keeps a window of zero instead of reading it
as unset"`, whose stated reason is *"zero means report no failures at all — a real choice, not an
omission"*. Rejecting `0` would break a documented choice to buy symmetry with an unrelated setting.

### D4 — the `documentIds` guard tests presence, not length

**Chosen:** `PayloadJobsTaskRunner.ts:297` becomes `documentIds ? new Set(documentIds.map(String)) : undefined`,
matching `SyncTaskRunner.ts:105` character for character.

**What lost:** keeping `?.length` and special-casing the empty list later. It lost because the two
runners would still differ in shape, and the shared suite grades them against one sentence.

### Placement

| Piece | Lands in |
|---|---|
| `hasError` in place of `error` | `payload-jobs-runner/store/normalizeJob.ts` |
| the empty-list guard | `payload-jobs-runner/PayloadJobsTaskRunner.ts` |
| `failedWindowMs` validation | `src/settings.ts` |
| the invariant moved + a new `excludeGivenUpBefore` case | `task-runner/__tests__/TaskRunner.invariants.ts` |
| `seedRun` learns to write `error`; two cases assert status | `apps/dev/src/integration/translator/panel-shows-what-is-happening.int.test.ts` |
| the tautological check deleted | `src/settings.test.ts` |

### New surface

**None.** No new exported symbol, no new file.

### Written contract?

**None new.** `TaskFilter`'s docblock already states what `excludeGivenUpBefore` means; D1 makes the
code agree with it rather than changing what is owed. This is a bug fix, so the failing test comes
first against the broken code.

### Does this need a separate design?

**No.** No new seam, no dependency, no data-model change. It makes two existing readers agree on one
field.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | A run between attempts (Payload writes `error`, no `hasError`) reports `pending` | the case `"treats a run that is still retrying as in flight, not as failed"`, with `seedRun` writing `error`; `bun run test:integration:{sqlite,postgres,mongo}` | green on all three |
| AC2 | A run that gave up (`hasError` + `error`) reports `failed` | the case `"names a run that failed inside the window"`, asserting `status`, same three runs | green on all three |
| AC3 | `findByCollection(SLUG, [])` answers `[]` **while a row for `SLUG` exists** | the moved invariant case — package `bunx vitest run` for `SyncTaskRunner`, the three integration runs for `PayloadJobsTaskRunner` | green for both runners |
| AC4 | The shared suite states what `excludeGivenUpBefore` owes | new case in `TaskRunner.invariants.ts`; same two routes | green for both runners |
| AC5 | `failedWindowMs: NaN` is refused at config time, named | new check in `src/settings.test.ts` expecting `TranslatorConfigError` | throws, message names `failedWindowMs` |
| AC6 | `failedWindowMs: 0` still resolves to `0` | the existing check `"keeps a window of zero…"` | unchanged, green |
| AC7 | The tautological check is gone | `grep -c "defaults the failure window to three days" src/settings.test.ts` | `0` |
| AC8 | No new type errors | `bun run check-types` here and in `apps/dev`; `bunx tsc --noEmit -p tsconfig.json` in `apps/dev` | 0 · 0 · 2 (both pre-existing, untouched files) |
| AC9 | No new lint findings | `bunx oxlint .` here, `bunx oxlint src` in `apps/dev` | ≤ 46 / 0 errors · ≤ 5 |
| AC10 | Nothing else regressed | `bunx vitest run`; the three integration runs | ≥ 2096 unit (2097 less the deleted tautology, plus what is added); ≥ 235 / 240 / 233 |

## Pre-flight — every check run against the untouched tree

| AC | Result now | Classification | Evidence |
|---|---|---|---|
| AC1 | **FAILS** | change | `expected [ 'failed' ] to deeply equal [ 'pending' ]` — measured by seeding `error` the way Payload writes it |
| AC2 | **FAILS** | change | `expected [ 'pending' ] to deeply equal [ 'failed' ]` — measured by adding the status assertion |
| AC3 | **FAILS** for `PayloadJobsTaskRunner` | change | `expected [ { id: 'job-1', …(7) } ] to deeply equal []` — the invariant applied to that runner with a row present |
| AC4 | **FAILS** | change | `grep -c excludeGivenUpBefore TaskRunner.invariants.ts` → `0` |
| AC5 | **FAILS** | change | `NaN ?? default` → `NaN`; `new Date(Date.now() - NaN).toISOString()` → `RangeError: Invalid time value` |
| AC6 | passes | invariant | the check exists and is green |
| AC7 | **FAILS** | change | the grep returns `1` |
| AC8 | 0 · 0 · 2 | invariant | baseline |
| AC9 | 46 / 0 · 5 | invariant | baseline |
| AC10 | 2097 · 235 / 240 / 233 | invariant | baseline |

Seven criteria fail now and must pass; three are invariants. No criterion already passes for the
thing it is meant to prove.

## Risk notes

**Risk classification: HIGH.** D1 changes a value that two HTTP bodies and four client readers
consume, including the one that decides whether the admin panel keeps polling. The change is
correct-by-measurement but its blast radius is the whole status surface.

What that buys downstream, and will be honoured: the owner confirms the behaviour change before
implementation; a failing test before the fix, not after; an **evidenced** regression sweep naming
what was grepped and how many call sites were read; three review angles.

**Hazards:**

- **A real loss, accepted:** `statusRows.ts:94` shows `run.error?.message` only when the status is
  `failed`. After D1 a run between attempts stops showing its error text. The editor sees "queued"
  where they used to see the transient error. This is the price of removing the false alarm, and it
  is the one user-visible regression in the change.
- The sibling cases in the `findByCollection` block are written as *filter out the wrong ones and
  expect `[]`* — a shape that also passes on an empty result. The case this task moves there must
  **not** copy that shape; it asserts the whole answer. The sibling weakness is out of scope and
  recorded here rather than fixed.
- `seedRun` writes through `payload.db.updateOne` because `payload.update` rewrites `updatedAt`.
  Teaching it `error` must not route the row back through `payload.update`, or every window test
  starts passing for the wrong reason.

## Decisions by the owner

- **2026-10-14** — change the behaviour rather than leave the mismatch: what every reader of
  `Task.status` sees changes, because the panel reports a false alarm and such a row never ages out
  of the window.
- **2026-10-14** — scope held to four defects. The audits also found: the client widget chain
  relaying `targetSelection` through 20 sites, `PayloadJobsTaskRunner.test.ts` holding 18 doubles
  over 887 lines, `GetCollectionStatusOutput` bound to nothing, 24 comment findings, and a missing
  README line. All deliberately left out as separate passes.

- **2026-10-14** — the lost error text is accepted rather than compensated. Rejected: also showing
  `run.error?.message` on a `pending` run in `statusRows.ts`; the scope stays at four defects and the
  client is untouched. The transient error text disappears from
  the document panel; it is shown today only under a label (`Failed`) that is itself the false alarm
  this task removes.

## Verification — 2026-10-14

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | met | red before: `expected [ 'failed' ] to deeply equal [ 'pending' ]`; green after on sqlite · postgres · mongo |
| AC2 | met — **but the pre-flight was wrong**, see below | green before and after |
| AC3 | met | red before, through the shared suite against a real PostgreSQL: `expected [ { id: '22', …(31) } ] to deeply equal []` — 32 rows where none were owed. Green now for both runners |
| AC4 | met | the shared case is green for both runners and renamed to what it guards; the give-up branch it could not reach under `SyncTaskRunner` is now covered directly in `SyncTaskRunner.test.ts`, with both sides proven by mutation |
| AC5 | met | red before: `expected [Function] to throw an error`, three times; green now |
| AC6 | met | `"keeps a window of zero instead of reading it as unset"` unchanged and green |
| AC7 | met | `grep -c` → `0` |
| AC8 | met | package 0 · `apps/dev` check-types 0 · `apps/dev` tsconfig.json 2 (`payload.config.ts:166`, `vitest.integration.config.ts:21`, both pre-existing) |
| AC9 | met | `Found 46 warnings and 0 errors` · `apps/dev` 5 warnings. Lint against the base: nothing introduced |
| AC10 | met | package **2103** passed / 151 files; sqlite 236 · postgres 241 · mongo 234, all above baseline |

### Two corrections to this contract's own pre-flight

**AC2 was classified `change` and is actually an invariant.** The pre-flight claimed it failed. It did
— but for a fixture reason, not for the defect: the measurement that produced
`expected [ 'pending' ] to deeply equal [ 'failed' ]` added a status assertion while leaving the old
`seedRun`, which wrote no `error` at all. With a fixture that writes what Payload writes, a run the
queue gave up on carries **both** `error` and `hasError`, so the old rule answered `failed` too. AC2
guards against the fix over-correcting; it never could have proved the fix was needed.

**D4 needed more than the guard it named.** The decision said `documentIds ? … : undefined`, matching
`SyncTaskRunner` character for character. That alone sent `{ in: [] }` into the query through
`ofDocuments`, and **PostgreSQL rejected it** — error `42601`, `scanner_yyerror`: `IN ()` is a syntax
error there, while SQLite and MongoDB accept it. Found only by the full three-adapter run; the file
passed in isolation. The implementation therefore answers an empty list **without issuing a query**:

```ts
const wanted = documentIds ? new Set(documentIds.map(String)) : undefined;
if (wanted?.size === 0) return [];
```

An empty list names no document, so the answer is empty by definition and no storage is involved.

### Prevention — the sweep (high risk, so evidenced)

Two greps over `src`, every match read:

- **`hasError` readers — 7 matches.** The fix brings the one dissenter into line with code that was
  already right: `model/owedOnCancel.ts:14` (`job.hasError === true ? [] : …`, whose docblock already
  stated *"Payload leaves `hasError` set from that moment on"*) and `model/planEnqueue.ts:42`
  (`job.hasError !== true`) both keyed on `hasError` before this change, as did `settledSince`.
  `getJobStatus` was the only place reading `error` as proof of failure.
- **`error` readers — 34 matches**, of which 21 are zod validation results or React form state and are
  unrelated. The rest were read individually: `normalizeJob.ts:43,83` carry the error *text* (correct
  to key on `error` — the message exists from the first failed attempt), `normalizeJob.ts:44` and
  `planEnqueue.ts:41` read cancellation out of the error payload, and `statusRows.ts:94` plus
  `TranslationStatusList.tsx:189` are the accepted loss recorded under Decisions by the owner.

Guardrails left behind: the moved invariant now holds **both** runners to the empty-list rule on three
adapters, and `"reads a run that failed an attempt but will retry as pending"` pins the status rule at
the unit level.

### Comments

One comment added by this task — the docblock on `failureShape` naming the two shapes Payload writes,
with its citation. Kept: the constraint itself is structural (the union `"gave-up" | "retrying"` makes
the invalid combination unexpressible), so the prose carries only the external fact.

### A pre-existing check failure, unchanged

The diff check reports one failure on `apps/dev/src/integration/translator/locale-workflow-failure.int.test.ts`
— one assertion line replaced (`["fr", "failed"]` → `["fr", "pending"]`). It predates this task and
belongs to the panel work; this task did not touch that file. After this change the assertion holds
for a second, better reason: the run-level rule now agrees with the locale-level one.

## Review log

**2026-10-14 · three angles, high risk.**

- **Consumers of `Task.status`.** Walked all 11 independently and confirmed the list complete: the
  only `status ===` match outside it, `TranslateFieldControl.tsx:107`, reads a different field. Four
  consumers change behaviour and all four improve — `useDocumentTranslation.ts:51` resumes polling,
  the two HTTP bodies stop reporting a false `failed`, and `panelStatus.ts` shows "running" instead
  of a permanent red. Confirmed `SyncTaskRunner` needs no matching change: it holds its own in-memory
  `Task`, has no retries, and marks a failure terminal at once — so it has no "will retry" state to
  distinguish, and its `status === "failed"` cutoff does not diverge from the `hasError` column.
  Confirmed `isCancelled(job.error)` still holds: the only producer of `{ cancelled: true }` in the
  installed Payload is `JobCancelledError` in `runJobs/index.js`, which writes `hasError: true` in
  the same `updateJob` call, and the plugin never throws an error carrying `.cancelled` itself.
  **One finding, applied:** the comment at `cancel-by-collection/handler.ts:33` said a retrying job
  "has no `pending` row" — true under the old rule, false under the new one. The filter's logic is
  unchanged and still correct; the comment now states the constraint that survives (a job with any
  locale in flight is not cancellable, so the filter excludes rather than selects). The deep review
  of 2026-10-14 had raised the same line independently.
- **The storage boundary.** No findings. Verified that `ofDocuments` has exactly one production
  caller and is now unreachable with an empty list, closing the PostgreSQL `IN ()` route entirely;
  that `toTaskFilter` keeps "absent" and "empty" distinct; and that the other places building
  `{ in: [...] }` — `cancel` and `visibleIds` — already guard an empty list. Confirmed independently
  by reading `collection-utils.ts:43` (`if (ids.length === 0) return new Set();`). Also confirmed
  `resolveSettings` is the only production route to `failedWindowMs`, so a bad value cannot reach the
  date arithmetic another way.
- **Whether the new tests discriminate.** **One finding, applied, in a case this task added.** The case this
  task added to the shared suite — then named *"keeps work still in flight however old the cutoff
  makes it"* — is a real check under `PayloadJobsTaskRunner` (with `autoRun: false` the row stays
  `pending`, so removing the `{ hasError: { not_equals: true } }` branch of `settledSince` would fail
  it) but **not** under `SyncTaskRunner`: that runner awaits its handler inside `enqueue`, and the
  contract test's handler always succeeds, so the task is `completed` before the filter runs and the
  branch `excludeGivenUpBefore && task.status === "failed"` (`SyncTaskRunner.ts:111`) is never
  entered. Worse, that branch was covered by **nothing at all** — `excludeGivenUpBefore` appears in no
  test of the sync runner. Verified both claims directly.

  Two repairs: the shared case is renamed to what it actually guards for both runners —
  *"rejects nothing but a run that gave up, whatever the cutoff"* — and `SyncTaskRunner.test.ts`
  gains a `describe("excludeGivenUpBefore")` that drives a task to `failed` with a rejecting handler
  and checks both sides of the cutoff. Each side proven by a mutation, both reverted and the revert
  verified:

  | Mutation on `SyncTaskRunner.ts` | Went red |
  |---|---|
  | the whole cutoff branch deleted | *"drops a run that gave up before the cutoff"* only |
  | `<` inverted to `>` in the comparison | both cases |

  The review also noted the `log` entry in *"treats a run that is still retrying…"* does not affect
  the outcome for a single-locale run — harmless surplus in the fixture, left as is — and that
  `toThrow(/failedWindowMs/u)` pins the setting's name but not the message's wording. Both recorded,
  neither acted on.

