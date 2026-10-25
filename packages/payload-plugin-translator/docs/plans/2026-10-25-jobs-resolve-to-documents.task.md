Build step: 2026-10-25-asking-payload-everywhere.design.md #6

## Task restatement

Three routes act on **jobs** without asking who the job belongs to or which document it touches:
`POST /translate/run/:id`, `DELETE /translate/cancel`, `DELETE /translate/cancel-by-collection/:slug`.
Those are gaps 1–3 of the six measured.

A job is the plugin's own object, and the host has no rule about it. So the job question is
**reduced to the document question**: a job may be cancelled by anyone who may change its document,
and run by them too — unless nobody is recorded as having started it.

Covers **R2** and **R5**. Out of scope by the design's sequence: the brand at the queue sink (#7), the
three-valued identity (#8), the module seam (#9), pins and `@since` (#10).

## Measured, not assumed

| Claim | Measured |
|---|---|
| `run/:id` checks nothing | `run-translation/handler.ts` parses an id and calls `runner.run(id)` |
| `cancel` checks nothing | `cancel/handler.ts` parses ids and calls `runner.cancel(ids)` |
| the requester is already stored | `jobInput.schema.ts:39-40` — `requester_id`, `requester_collection`, both nullable |
| a task already names its document | `types.ts:32-37` — `TaskInput` carries `collectionSlug` and `collectionId` |
| **`cancel-by-collection` already holds the documents** | it calls `findByCollection(slug, {excludeCompleted: true})` and gets `Task[]`, each with `input.collectionId` |
| the sync runner cannot run or cancel anything | `SyncTaskRunner.cancel` is a no-op; `run` returns `{success: false, error: "not_found"}` unconditionally |
| the jobs runner can read by handle | `PayloadJobsTaskRunner.cancel` already does `findRawJobs({ id: { in: taskIds } })` |
| the client reads neither cancel response | `useCancelDocumentTranslation` and `useCancelCollectionTranslations` both return `Promise<void>` |

## What already exists — platform · installed · project · verdict

| Rung | Found | Verdict |
|---|---|---|
| project | `refusedTargets({payload, collection, ids, user})` (step 5) | **its genuine second caller is here** — but only on `cancel-by-collection`, which already has document ids. The other two routes hold handles, not ids |
| project | `TaskRunner.findByCollection` | already returns the rows `cancel-by-collection` needs. Nothing new is required there |
| project | `PayloadJobsTaskRunner.findRawJobs` | the read that `assignmentsOf` is built on |
| project | `Task` (`types.ts:50`) | carries `id` and `input`, but **not** the requester — `normalizeJob` drops it |
| platform | Payload's jobs queue | has no notion of who may cancel a job; the rule is the plugin's |

Nothing new is installed.

## Decisions

### D1 — `cancel-by-collection` asks with the rows it already has

**Chosen:** filter the rows `findByCollection` returned through `refusedTargets` over their
`input.collectionId`, before any of them is cancelled.

**Rejected — route it through the new `assignmentsOf`.** It would re-read from the store what the
handler is already holding, and make a route depend on an optional method it does not need.

**Constraint cited:** `cancel-by-collection/handler.ts` already builds `rows` from `findByCollection`,
and every row's `input.collectionId` is the document. The design's own wording — "jobs resolve to
documents" — is already satisfied there without a new seam.

### D2 — `run` and `cancel` need a handle-to-document read, and that is the new method

They receive handles and have no other way to reach a document. `TaskRunner` gains **optional**
`assignmentsOf(handles): Promise<JobAssignment[]>`, with
`JobAssignment = { handle, collectionSlug, collectionId, startedBy }`.

**Rejected — widen `EnqueueAssignment`.** It is per **locale**, and it is handed to host lifecycle
callbacks, which must not start carrying requester ids (the design's own reason, SC4).

**Rejected — surface the requester on `Task`.** `Task` reaches `findByCollection`'s callers and the
status routes; putting a requester id there would publish it far wider than the two routes that need
it.

### D3 — the sync runner implements it; only a host runner is fail-closed

**Chosen:** `SyncTaskRunner.assignmentsOf` answers from its in-memory `tasks` map, with
`startedBy: null` — it stores no requester.

**Rejected — leave it unimplemented and let fail-closed cover it.** `apps/cms` wires the sync runner,
and a fail-closed `cancel` there would turn a harmless no-op into a `403`. Implementing it is eight
lines and keeps that path exactly as it is.

**Fail-closed therefore binds only a runner supplied by a host**, which is where the design meant it.

### D4 — a handle that resolves to nothing is **absent**, not refused

**Chosen:** no assignment for a handle answers `404` on `run/:id`, which is what it answers today.
A handle that *does* resolve and whose document is refused answers `403`. On `run/:id` a resolved job
with `startedBy: null` also answers `403`.

**Rejected — refuse an unresolvable handle.** It would turn the sync runner's permanent `not_found`
into `403`, changing a route's answer for every host on that runner without closing anything: there
is no job to protect.

**Constraint cited:** step 3 settled the same question the same way — `absenceIsNotARefusal`, and
`sourceDocument.ts`'s "refused and absent are deliberately identical". Absence is not a refusal here
either.

### D5 — `cancel` drops the refused handles and names them

**Chosen:** cancel the handles the caller may change; answer `204` when nothing was refused, and
`200` with `{ refused: [...] }` when something was — mirroring step 5's `refused` key.

**Rejected — refuse the whole request if any handle is refused.** It contradicts step 5's decision on
the same question, taken one commit earlier for the same reason: a caller entitled to most of a batch
should not lose it.

**Rejected — stay on `204` and say nothing.** A caller would believe work was cancelled that was not.

**Constraint cited:** both cancel routes are consumed by mutations typed `Promise<void>`
(`useCancelDocumentTranslation`, `useCancelCollectionTranslations`), so a body added on the refusal
path is invisible to the only client in this repo.

### D6 — shape check

Triggers that fired: a **new optional method** on a port implemented outside this package; a new
published type (`JobAssignment`); a response gains a field.

| | `JobAssignment` as its own type *(chosen)* | `startedBy` added to `Task` |
|---|---|---|
| cost of the next field of this kind | one place — the two runners that produce it | every consumer of `Task`, including the status routes |
| states admitted vs produced | `startedBy` nullable, and both halves occur (jobs runner records one, sync runner never does) — gap **0** | admits a requester on rows that never carry one |
| second caller already in the repo | `run` and `cancel` handlers | same |
| breaks outside this repo | nothing: the method is optional, so an existing runner still satisfies the interface | a host reading `Task` sees a requester id it never asked for |

**Chosen:** the first. `startedBy` is nullable **because the system produces both**, not to paper over
an unknown — the sync runner stores no requester and says so.

## Acceptance Criteria

| # | Covers | Criterion | How it is checked (binding) |
|---|---|---|---|
| AC1 | R5 | `POST /run/:id` answers `403` for a job whose document the caller may not change, and does not run it | a case in `run-translation/__tests__/` asserting `runner.run` was not called |
| AC2 | R5 | `POST /run/:id` answers `403` for a resolved job with `startedBy: null` | a case in the same file |
| AC3 | R5 | `POST /run/:id` still answers `404` when no assignment resolves — unchanged | a case asserting the status is 404, not 403 |
| AC4 | R5 | `DELETE /cancel` cancels only the handles the caller may change | a case asserting `runner.cancel` received the allowed handle and not the refused one |
| AC5 | R2 | …and names the refused handles | the same case reads `refused` from the body |
| AC6 | R5 | `DELETE /cancel-by-collection/:slug` cancels no job whose document the caller may not change | a case in `cancel-by-collection/__tests__/` |
| AC7 | R2 | Every ask precedes the effect | **mutation**: move each filter after its `runner` call; AC1, AC4 and AC6 must go red |
| AC8 | R6 | A runner that omits `assignmentsOf` still satisfies `TaskRunner` | the pins file compiles a runner without it |
| AC9 | R5 | An actor-less caller behaves exactly as today | the integration suites that cancel and run without a user stay green |
| AC10 | R5 | The baseline holds | real `turbo build` green; integration **225 passed / 8 skipped** |

## Pre-flight — each check run against the CURRENT tree

| # | Polarity | Result now | Evidence |
|---|---|---|---|
| AC1–AC2, AC4–AC6 | must FAIL | **fail** | `grep assignmentsOf src` → nothing; all three handlers call the runner with no ask |
| AC3 | must PASS | **passes** | `run/:id` answers 404 for an unknown id today |
| AC7 | must FAIL | **fails** | there is no filter to move |
| AC8 | must PASS | **passes** | no runner implements a method that does not exist |
| AC9, AC10 | must PASS | **pass** | 197 files / 2531 checks, build green, 225/8 |

## Risk notes

**High risk.** This decides who may cancel and re-run other people's work, and it adds a method to a
port implemented outside this repo.

- **The silent-drop hazard** is the same as step 5's, which is why AC5 exists.
- **`cancel` changes status code on one path** (`204` → `200` with a body). Invisible to this repo's
  client, but it is a contract change and owes a release-note line at step 10.
- **The sync runner path must not change at all** — `apps/cms` runs on it. D3 and D4 exist to keep it
  identical, and AC3 is the guard.
- **SC6 residue, already named in the design:** a run triggered by A on B's attributed job is still
  recorded as B's. Closing it means a stored-row change, out of scope; a log line names it.
- A test is required before done; the regression sweep is evidenced; Phase 5b runs several angles.

## Human choices

**2026-10-25.** The owner directed an uninterrupted run through steps 5–10, stopping only at a
genuine fork. No fork arose: D1 and D4 follow decisions already taken in steps 3 and 5, D2 and D6
follow the design's SC4, and D5 follows step 5's answer to the same question one commit earlier.
Commit authority granted in advance; no push, no pull request.

## A test was changed to fit the code — stated plainly

`apps/dev/.../locale-workflow-failure.int.test.ts` went red. It enqueued **with no user** and then
retried through `POST /translate/run/:id`, which now refuses a job nobody is recorded as having
started (D4, from the design's D5).

I gave it an attributed editor rather than relaxing the rule. The reasons, so the choice can be
judged rather than taken on trust:

- **The test's subject is retry semantics** — "stops there, leaves the locales after it untouched,
  and resumes on retry" — not permissions. Attributing the job preserves what it tests.
- **The refusal is real and wanted.** A job with no requester runs with the host's rules off
  (`enforcedAtTheWrite(null)`). Letting any HTTP caller trigger one by naming its handle is the
  escalation this step exists to close.
- **It does not contradict SC1.** That deviation keeps *in-process* unattributed work trusted — a
  save, a local-API call. `run/:id` is an outside caller asking the plugin to start that work.
- **Normal use is unaffected**, verified: auto-translate passes `identityOf(req, …)` when it
  enqueues (`AutoTranslateEnqueue.hook.ts:79-81`), so a job from an editor's save is attributed. Only
  a save made with no user at all produces an unattributed job.
- **The refusal is pinned independently** by AC2 at unit level, mutation-proven — so removing the
  rule turns a check red whatever the integration fixture does.

**Owed:** an integration pin for the refusal itself, and a release-note line. Both belong to step 10.

## Review log

**2026-10-25 — `/sp-complexity`.** Neighbourhood 8 files. Two scenarios counted. "A second optional
method on the runner port": CHANGE 4, READ 5, STATE 2 per method. "A route starts asking about a
document": CHANGE 1, READ 3 — unchanged from step 5, but one state grew, because there are now **two
shapes of asking** (by document id, by job handle) and a new route must pick. **No findings, no edit.**

**2026-10-25 — `/sp-abstraction`** on `assignmentsOf` / `JobAssignment`. Audited by the author.

- **Measured and confirmed rather than taken on trust:** `startedBy` is nullable honestly —
  `PayloadJobsTaskRunner.ts:208` writes `requester_id: scope.requester?.userId ?? null`, and the sync
  runner records nothing. Both halves occur.
- **What the author's own brief omitted:** `DELETE /translate/cancel` changes its **status code** on
  one path (`204` → `200`), not just its body. No type can see that.
- **Finding, fixed:** the caller filtered the **input** handles rather than the ones the runner could
  place, so a handle the runner never answered for went to `cancel` unasked. Harmless today in both
  in-repo runners, but it held by contract rather than by code. Now only what was placed and allowed
  is cancelled, pinned by a check and a mutation.

**2026-10-25 — `/sp-red-test` in audit mode.** Scaffolding deleted, `git status` shown.

- The first stub pattern **did not match** — the barrel imports `./readRequester.js`, not
  `store/readRequester.js` — and a run against a non-matching alias looks exactly like "nothing
  guards this". Caught by running a control: stubbing `refusedTargets` reddens 15 checks in 2 files,
  so the mechanism works.
- **Finding, fixed:** with `readRequester` stubbed to throw, **the entire suite stayed green** —
  200 files, 2545 checks. It had zero coverage, and it is the function deciding whether a job is
  attributed, which is what `run/:id` refuses on. Six checks added, three mutations. One of them
  earns its place on its own: a naive `!id` would read **user id `0`** as unattributed and refuse a
  legitimate re-run.

**2026-10-25 — `/sp-review-comments`.** 7 candidate blocks, 7 verdicts + 1 MISSING: 2 DELETE,
3 REWRITE-COMMENT, 1 REWRITE-CODE, 1 restored placement. Inline density 0.4 lines per 10 — fine; the
cuts were to docblocks.

Three substantive results, all defects rather than verbosity:

- **A public type lost its documentation.** `JobAssignment` had been inserted *between* the
  `EnqueueAssignment` docblock (`@since 0.16.0`) and `EnqueueAssignment` itself, so the public type
  was left bare and the new one carried two stacked blocks. Adjacency restored.
- **`readRequester`'s one-liner was false.** It claimed `null` means "a row that recorded nobody, not
  a row we failed to read" — but an `undefined` input and an empty `requester_collection` both answer
  `null` too. The distinction the sentence drew is one the function does not enforce.
- **A comment was covering for a split predicate**, so the code was changed instead: `cancel` now
  gets `{ allowed, refused }` from one function, and the cancel list can only come out of the ask.

**Found outside its own remit, and it was a real bug:** the refusal verdict was keyed by **document
id alone**, so two collections holding the same id cross-contaminated — a refusal in `pages` would
spare a job in `posts`. It over-refused, which is the safe direction, but it was wrong. Now keyed by
`collection:id`, with a check and a mutation.

### Verification after every fix

`check-types` 0 · oxlint 43 warnings / 0 errors (baseline) · package suite **201 files / 2552
checks**, up from 197 / 2531 by exactly +4 files and +21 checks (4 + 6 + 4 route checks, 6 for
`readRequester`, and 1 from the per-source-file throw test for the new file) · real `turbo build`
green, forced · integration **225 passed / 8 skipped** · `sp-diff-checks` clean · `sp-lint-delta`
introduced nothing.

### Owed to step 10

`@since` on `assignmentsOf` and `JobAssignment` (the package requires it on published API; the
version depends on the release) · an integration pin for the unattributed-job refusal · release-note
lines for the `204` → `200` change on `DELETE /cancel` and for the refusal itself.
