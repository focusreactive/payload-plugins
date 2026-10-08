# Run context through the translation lifecycle — #107, #110, #106, #103

Branch `feat/translator-lifecycle-run-context`, from `main` at `95f8f8d6` (0.15.0 released).
Target **0.16.0** — everything here is additive or a widening.

## Task restatement

Four issues from one consumer building an editorial process on top of the plugin. They are one
problem seen from four sides: **a host cannot connect what it asked for to what the plugin is
doing.**

The sharpened version, after reading the code: cancellation already works and the ids are already
obtainable, so #107 on its own is a convenience. **The real defect is that lifecycle callbacks carry
nothing that identifies the run** — so whatever the host stores, the event never mentions it. That is
#110, and the other three are around it.

## Premises that expired since 0.10.1

Checked against `main`, not assumed:

| Issue claims | Actually |
|---|---|
| #106: the plugin supersedes — cancels and deletes a prior job on enqueue | **Gone.** `PayloadJobsTaskRunner.test.ts:234` is a regression test: "never cancels or deletes a job when enqueuing". Only explicit cancellation remains, so a `reason` argument would have one possible value and is not worth having. |
| #107: respond with `jobs: { fr, de, it }` | **Does not fit.** One run covers a list of locales (`payload-jobs-runner/types.ts:81`) and one request spans several documents (`enqueue-translation/model.ts:13`). A locale-keyed map repeats one value and collapses across documents. |
| #110: one open run per (document, locale) | A constraint the **host** imposes on itself to make its join unambiguous. Removing the need for it is the point. |

## Human choices

**D1 — what "the run" is: the pair (handle, target locale).** Chosen at the gate 2026-10-06.
Rejected: an opaque `context` the host supplies and the plugin stores — the only option that also
answers "why did this run happen", but the plugin would take permanent custody of host-shaped data of
unknown size. Rejected: a plugin-minted run id — a second identifier beside one that already exists,
answering no extra question.

**D2 — the handle is opaque, and only the runner that minted it may interpret it.** The plugin
carries it from `enqueue` into the response and into the callbacks, and hands it back verbatim to
`cancel` and the by-handle read. It never parses it, constructs one, or keys its own state by it.
This is why the design survives a remote runner, and why the granularity does not matter: the
built-in runner mints one handle per document covering a list of locales; another could mint one per
locale. `JobIdSchema` already demands only "non-empty string or finite number", so nothing in the
plugin assumes a shape today — this records the rule rather than introducing it.

**D3 — the enqueue response is a flat list, one entry per requested locale:**
`{ collection_id, target_lng, job_id }[]`. Rejected: a nested map mirroring the request — reads well
for one document, badly for `select_all`, and the flat list is what a host writing one row per
(document, locale) consumes. It also accepts any handle granularity, per D2.

**D4 — `TaskRunner.enqueue` widens its return; it does not change it.** `TaskRunnerProvider` is
exported from `src/index.ts`, so implementations exist outside this package. The old `void` answer
keeps satisfying the contract and is deprecated for the next major, with a ledger entry. An overload
pair is **not** usable: an implementation must satisfy every overload, which breaks every third-party
runner.

**D5 — `onFailed` fires only on FINAL failure. There is no `attempt` field.** Retries are the
runner's internal business; while they are still happening the translation has not failed. Today the
callback fires per attempt (`wireTranslateRunner.ts:76`, inside the `catch`), which is why the
consumer runs with retries disabled — "failed" currently does not mean failed.

*Rejected: an `attempt` counter*, which is what #110 asks for by name. It lets a host tell the events
apart but still cannot say whether another try is coming, so it does not let them turn retries back
on — it answers the request, not the need.

**D5a — finality is observed, not computed.** The jobs runner fires `onFailed` from a hook on the
jobs collection, when Payload marks a row as having given up — not from the `catch` in
`wireTranslateRunner.ts`.

*Rejected: deriving it in the `catch`* by comparing the limit the plugin configured against the count
Payload keeps on the row. It is workable, and both numbers are ours, but it has to reproduce
Payload's comparison exactly — Payload gives up when *previous* attempts reach the limit and reads
that count before the run, so `attempts: 3` means **four** executions, and the natural reading fires
a run early.

**What decided it is not the arithmetic — it is coverage.** The workflow translates locales in
sequence and stops at the first throw (`PayloadJobsRunnerProvider.ts`, the `for` loop around
`await runLocale(...)`). So when a run gives up, its locales are in three states: translated, failed
terminally, and **never started**. The `catch` can only ever speak for the second — the handler for
the rest was never invoked, so there is nothing to catch. Reading the row sees all three, and lets
the host be told about the abandoned locales too, which is what it actually needs in order to stop
showing them as in flight.

Mechanism: `jobsCollectionOverrides` (`payload/dist/queues/config/types/index.d.ts:159`) lets the
plugin add an `afterChange` hook to the jobs collection. Two things it must not get wrong:

1. **Compose, do not replace.** `jobsCollectionOverrides` is one function per application. If the
   host already set one, call it and extend its result — otherwise the plugin silently drops the
   host's own configuration.
2. **Fire on the transition only** — when the "gave up" flag goes from absent to present. Any later
   write to the row would otherwise re-announce a failure that was already reported.

The sync runner is unaffected: it never retries, so every failure it sees is already final and it
keeps reporting from its own path. One contract, two routes to it.

Cost accepted: a host loses visibility of transient failures. They remain in Payload's job log, and a
separate callback for them is not worth inventing until someone asks. This is an observable change to
a documented contract (`lifecycle/types.ts` currently says the callbacks "fire per execution
attempt"), so it needs a ledger entry and a line in the release notes.

**D6 — `onCancelled` learns the document and locale through a new OPTIONAL by-handle read on
`TaskRunner`.** A runner that omits it keeps working and simply never fires that callback.
Rejected: the cancel route resolving a collection slug first — it holds only handles, so it would
either demand the slug from the caller or scan every configured collection, and it pushes runner
knowledge into an HTTP handler. Rejected: `onCancelled` carrying only handles — cheapest, but it
makes the host resolve them itself, which is the exact complaint in #103.

**D7 — `onQueued` carries no handle.** The decorator fires it *before* delegating, because the sync
runner translates inline during `enqueue` and would otherwise deliver "completed" before "queued".
The handle does not exist until `enqueue` returns. Consequence, accepted and to be documented: for an
HTTP-initiated run the enqueue response is the handle channel; for **auto-translate**, which a save
hook triggers with no response to return, there is no queue-time correlation at all — a host must
create its row on the first `onCompleted` / `onFailed`.

**D8 — two identical concurrent requests for one pair coalesce into one run**, by design: a repeat
request joins the live run rather than starting a second. Both of the host's intents therefore see
one handle and one event. Semantically right — there was one translation — but it means #110 is
narrowed rather than erased, and the README should say so.

**D9 — `onCancelled` does not fire for a locale the run already translated.** It was not cancelled.

**D10 — the sync runner does not implement the by-handle read.** Its `cancel` is a documented no-op
(`SyncTaskRunner.ts:72`) because the work is already done, so announcing a cancellation there would
report something that never happened.

## Acceptance criteria

| # | Criterion | How it is checked | Expected |
|---|---|---|---|
| 1 | `POST /translate/enqueue` answers with one entry per requested locale, each naming the handle that will run it | integration, real database | entries match the request |
| 2 | Two locales of one document name the same handle | integration | one handle, two entries |
| 3 | A request across two documents keeps them distinguishable | integration | four entries, two handles |
| 4 | A locale already covered by a live run is still named in the response | unit on `planEnqueue` + integration | the live run's handle, not an empty slot |
| 5 | `onCompleted` carries the handle the enqueue response named | integration, all adapters | equal |
| 6 | A locale that fails twice then succeeds fires `onFailed` **zero** times | integration, failing provider | `onFailed` not called; `onCompleted` once |
| 7 | A locale that exhausts its retries fires `onFailed` exactly once | integration | one call |
| 7a | A locale that never ran, because an earlier locale in the same run failed terminally, is still reported as failed | integration: two locales, the first fails until the run gives up | `onFailed` for both, not just the first |
| 7b | A locale the run already translated is **not** reported as failed when the run later gives up on another locale | integration: first locale succeeds, second exhausts its retries | `onFailed` only for the second |
| 8 | `onCancelled` fires once per locale the cancelled run still owed | integration | one call per unfinished locale |
| 9 | `onCancelled` fires before the run's row is deleted | integration, reading the row inside the callback | the row resolves |
| 10 | A runner without the by-handle read still cancels, silently | unit | cancel happens, no callback, no throw |
| 11 | `GET /translate/collection/:slug` names the document and locale | unit | both present |
| 12 | A third-party runner returning `void` from `enqueue` still compiles and still queues | compile-only fixture under `check-types` | narrowing the contract fails the build |
| 13 | A host registering only `onCancelled` receives it | integration | fires |
| 14 | Every new public symbol carries `@since 0.16.0` | grep over the diff | one per symbol |
| 15 | Nothing else regresses | three checks + the integration matrix (three adapters, each with and without the exclusive queue) | at or above baseline |

**Baselines on this branch, measured before any change:** unit **1929** in 136 files; `check-types`
clean; oxlint **55 warnings / 0 errors**.

## Criteria pre-flight — run 2026-10-06 against the untouched tree

All of 1-14 fail; 15 passes. Each checked at a line rather than assumed:

| # | Why it fails today |
|---|---|
| 1-3 | `enqueue-translation/handler.ts:98` answers `{ success, queued }` — a count and nothing else |
| 4 | `planEnqueue.ts:20` — `EnqueuePlan` is `{ host, append, queue }`; a locale already covered has no slot |
| 5 | `TranslationTask` has no handle field |
| **6, 7** | `wireTranslateRunner.ts:76` fires `failed` inside the `catch` with no finality check — **per attempt**. The only criterion that asks existing behaviour to change, so the only one at real risk of already passing. It does not. |
| 8, 9, 13 | there is no `onCancelled` |
| 10 | no by-handle read on the contract (0 occurrences) |
| 11 | `get-collection-status/handler.ts:42` maps to `{ id, status }`, discarding the two fields it holds |
| 12 | `enqueue` returns `Promise<void>`, so there is no union to narrow and the fixture cannot be written |
| 14 | no new public symbols yet |
| 15 | **passes** — 1929 unit / 136 files, `check-types` clean, oxlint 55-0 |

**Surfaced by the pre-flight and not previously in this plan:** `wireTranslateRunner.ts:87` gates the
decorator on `lifecycle.onQueued` alone —

```ts
if (!lifecycle.onQueued) return taskRunner;
```

so a host registering **only** `onCancelled` is handed an undecorated runner and hears nothing. The
gate has to widen to "any callback the decorator itself fires", which is what criterion 13 pins.

## Known gap, surfaced not hidden

`withQueuedNotification.ts:19` currently does `await runner.enqueue(...)` and discards the result.
Left alone, every host that registers `onQueued` would silently receive an empty handle list. Fixed
as part of this change; criterion 1 is run through a decorated runner so it cannot regress.

## Risk

**High.** Two externally-implemented contracts, four HTTP responses, two runner implementations, and
a retry path that only shows itself on a real database.

### One behaviour change outside the criteria — the task id reaches the host as a string

`normalizeJob` returned Payload's row id untouched, so on SQLite and Postgres a `Task.id` was a
number although `Task.id`, `JobStatusOutput.id` and `CollectionStatusItem.id` all declare `string` and
every client fixture already uses one. The handle made the inconsistency reachable: the same run
arrived as `"12"` through the execution path and `12` through the cancellation path, and the
integration check comparing the two is what found it.

It is fixed at the ingress — one `handleOf` for the loosely-typed queue reply, `String(job.id)` in
`normalizeJob` — so one spelling leaves the plugin. **What this changes for an existing install:**
`GET /translate/document/:slug/:id` and `GET /translate/collection/:slug` answer with `"id": "12"`
where they answered `"id": 12`. A host that compared that field to a number is affected. The
declared type always said `string`, so nothing documented changes, but the wire does.

### Cancelling does not stop a locale already in flight

`TaskRunner.cancel` cancels the Payload job and deletes its row; the handler that is mid-translation
does not notice and finishes. So that locale is announced cancelled and then completed — two events
for one locale, against the rule stated beside the callbacks. Deleting the row under a running job
also makes Payload's own `updateJob` throw, so `payload.jobs.run` rejects.

Both are older than this task — `cancel` is byte-identical to `main` — and fixing them means
changing what cancellation does, which is its own piece of work. What this task did fix is the part
it caused: a run whose row vanished under it used to be reported to `onFailed` as every locale giving
up, because the machinery error reached the same catch as a translation failure.
`cancel-while-running.int.test.ts` pins that, and the callback docblock now states the exception.
That check runs on SQLite only: cancelling from inside the running job deletes a row the job's own
transaction holds, which on Postgres blocks until the suite's teardown times out. Which callbacks
fire is plugin logic and does not vary by adapter, so the narrower run still answers the question.

## Follow-ups — deliberately not in this task

- **Rework `TaskRunner` into a small required core plus declared optional capabilities.** Today the
  interface demands `findByCollection`, which requires the runner to index work by the *plugin's*
  domain concepts — a reasonable ask of an in-process Payload runner, an unreasonable one of a remote
  queue. A split into required `enqueue` / `cancel` and optional `inspect` / `rerun` would let a
  runner declare what it can do and let the plugin degrade rather than break. D6's optional read is
  the first instance of that shape; the rework itself is its own piece of work.
- A signal for "this failure is not final", if a host ever wants per-attempt visibility back.

## Verification — 2026-10-07, each criterion against the check it declared

| # | Verdict | Evidence |
|---|---|---|
| 1 | met | `enqueue-handles.int.test.ts` — "answers once per requested locale, naming a run that really exists", on every adapter |
| 2 | met | same file — "gives two locales of one document the same run" |
| 3 | met | same file — "keeps two documents apart" |
| 4 | met | `planEnqueue.test.ts` — "reports a locale the live job already owes as covered by it"; `enqueue-handles` — "still names the run for a locale a live run already covers" |
| 5 | met | `completed-handle.int.test.ts`, on every adapter |
| 6 | met | `final-failure.int.test.ts` — "says nothing while the run is still retrying, and reports success once it works" |
| 7 | met | `final-failure` — the reported set is compared whole, so a second call for one locale fails it |
| 7a | met | `final-failure` — "reports every locale the run never got to"; `gave-up-mid-run.int.test.ts` for the case where the run, not the locale, runs out of attempts |
| 7b | met | `final-failure` — "does not report a locale the run had already translated" |
| 8 | met | `cancel-announcement.int.test.ts` — "names every locale the run still owed, and no locale it had delivered" |
| 9 | met | same file — "announces while the run is still on record" |
| 10 | met | `withQueuedNotification.test.ts` — cancels, announces nothing, and is not asked to resolve |
| 11 | met | `get-collection-status/handler.test.ts` — fixtures differ by document as well as locale |
| 12 | met | `TaskRunner.conformance.types.ts` under `check-types`, written against the published barrel; narrowing `enqueue` produces 6 type errors |
| 13 | met | the `cancel-announcement` boot registers `onCancelled` and nothing else; narrowing `needsDecoration` back to `onQueued` turns it red |
| 14 | met | swept over the diff: `handle`, `onCancelled`, `EnqueueAssignment`, `findByIds`, the widened `enqueue`, `TaskHandlerInput.handle`, `reportFinalFailure`, `reportsFinalFailure` |
| 15 | met | 2015 unit / 142 files (baseline 1929 / 136) · `check-types` 0 · oxlint 55-0 (baseline 55-0) · declaration build green · integration 6 of 6 combinations |

None recorded `not verified`: every criterion was checked the way it said it would be.

## Review log

### 2026-10-07 — comment audit (fresh-eyes auditor, 45 blocks)

Density was 2.5 comment lines per 10 lines of code, all of it in docblocks: roughly 14 doc lines per
new exported symbol, with four units documented at several times their own length (`stillOwed` 35
doc / 3 code, `alreadyCovered` 37 / 13, `isLastAttempt` 17 / 5). 10 deleted, 24 shortened, 2 turned
into code changes, 9 kept. Result: **163 lines over 1203, 1.35 per 10.**

Two findings became code rather than prose: the workflow handler's catch body became
`owedIfGaveUp.ts`, with `taskStatus` given a typed home on `PayloadJob` instead of a structural
cast; and `final-failure.int.test.ts`'s load-bearing `<=` became `PASSES_UNTIL_THE_RUN_GIVES_UP`.
Two `{@link}` references that did not resolve (the symbol was never imported) were corrected. One
verdict could not be applied as given: `SyncTaskRunner.cancel`'s body comment was load-bearing for
`no-empty-function`, so the body became `return Promise.resolve()` instead.

### 2026-10-07 — fresh-eyes review of the whole diff

Six findings were real and are fixed; each is pinned by a check that was proven to go red without
the fix.

1. **A run could be abandoned with `onFailed` never firing.** Payload gives up two ways — the
   locale's own attempts against the task limit, and the whole run's executions against the workflow
   limit (`getWorkflowRetryBehavior.js:8`) — and only the first was reproduced. The counters diverge
   as soon as attempts are spent on more than one locale, and the run's runs out first, so a run that
   had stopped was read as still trying. `owedIfGaveUp` now asks both. Pinned by
   `gave-up-mid-run.int.test.ts`; reverting the second counter turns it red.
2. **The enqueue answer named a run that had already given up.** Found independently here and by the
   reviewer. `pickHost` now refuses a run carrying `hasError`. Pinned by
   `retranslate-after-giving-up.int.test.ts`, which was written red and watched fail.
3. **A cancelled run reported every locale as failed.** Deleting the row under a running job makes
   Payload's own machinery throw, and that throw reached the same catch as a translation failure.
   The report now happens only when the plugin's handler threw. Pinned by
   `cancel-while-running.int.test.ts`. The rest of that finding is recorded above as a known gap.
4. **`onFailed` stopped carrying the plugin's own error.** Payload replaces a task's error with a
   message-only copy, so a host matching on the exported error classes silently stopped matching.
   The handler's error is now kept, weakly keyed by the run, and handed back. Pinned by an assertion
   in `gave-up-mid-run.int.test.ts`.
5. **A third-party runner could not name what the contract tells it to return.** `EnqueueAssignment`
   and `Task` are now exported from `src/index.ts`, and the conformance fixture annotates with them
   instead of relying on inference.
6. **`EnqueuePlan`'s "exactly one of three lists" was not enforced.** Two predicates decided
   "already translated" — latest-log-wins for `queue`, any-succeeded for `covered` — so a locale
   logged `[succeeded, failed]` landed in no list and was dropped from the answer. One predicate now
   decides both.

Also from that pass: four checks that would have passed without the behaviour they named —
`taskFromStored` and the `handle` branch of `taskFromHandlerInput` were untested, every
collection-status fixture shared one document id so a constant column passed, and `stillOwed` never
exercised the `running` state its own contract names. All four are now covered.

### 2026-10-07 — sp-review-deep (focus: does the work meet #107/#110/#106/#103's real need)
- **Vectors:** core(correctness · regression · intent) + contracts-types · tests · abstractions-solid ·
  conventions · architecture-fit  ·  **Rounds:** 1 parallel find round + 1 opus adversarial round
  (loop-until-dry stopped after round 2: reopening count 0 → 0, no further round)
- **Findings:** 9 raised across both rounds · 6 dropped (low confidence) · 3 reported · 0 unresolved-reopening
- **Reopening per round:** 0 → 0 (converged — every surviving finding is docs-only or spec-only, none
  breaks a criterion at runtime today)
- **Per-issue verdict, independently reached twice (parallel fan-out, then opus re-verification against
  Payload's own compiled source):**
  - **#107** — met. The flat list genuinely lets a host record a job id per document×locale row,
    including the multi-document case; `planEnqueue`'s `append ∪ queue ∪ covered` was hand-verified as
    a true partition of the requested locales.
  - **#110** — met for run identity (the handle is structurally guaranteed to match between the enqueue
    response and every callback — verified against `getRunTaskFunction.js` passing the same job object
    by reference), narrowed exactly as D5 records for the attempt-counter half (no attempt field; a host
    wanting live per-attempt visibility is not served, by design).
  - **#106** — the supersede half has genuinely expired: verified directly (not from the contract's own
    say-so) that no enqueue-time cancel-and-replace exists anywhere in `planEnqueue`/`PayloadJobsTaskRunner`,
    and `PayloadJobsTaskRunner.test.ts:234`'s regression guard is unmodified by this diff. `onCancelled(task)`
    without `reason` is correct, not a gap, because there is only one path left to report.
  - **#103** — met; snake_case matches every other field this same HTTP surface already uses (and the
    sibling `get-document-status` endpoint), so it is consistency, not a substitution.
- **Resolved (reported, fix=off so these are handoffs, not edits):**
  - `README.md:419` (+4 related gaps: `onCancelled` undocumented, `/enqueue`'s `jobs` array undocumented,
    `EnqueueAssignment`/`Task` missing from the exports table, no `Since v0.16.0` note anywhere) — the
    stale "onFailed fires per attempt" claim directly contradicts D5 and this diff's own
    `docs/DEPRECATIONS.md#on-failed-per-attempt` entry. Confidence 90.
  - `PayloadJobsRunnerProvider.ts:222` — `owedIfGaveUp(job as unknown as PayloadJob, ...)` is an
    unnecessary type-erasing cast (confirmed by compiling a probe: `job` is structurally assignable to
    `PayloadJob` without it); a future drift between `PayloadJob` and Payload's real `Job` type would
    compile silently here and could feed `owedIfGaveUp` `undefined` counters, read as `0`, falsely
    reporting a final failure on the first attempt. Confidence 80.
  - `src/index.ts:62` / `TaskRunner.interface.ts:34` — the published barrel describes `findByIds` as
    "a `Task` per handle," but the shipped granularity (and the only correct one, given `onCancelled`
    fires once per returned Task) is one `Task` per handle×locale. A third-party runner built strictly
    from the barrel's wording would silently drop every locale but one from its `onCancelled`
    announcements. Confidence 82.
- **Left open (dropped, low confidence <75 — reported here for the record, not acted on):**
  - `wireTranslateRunner.ts:78` — a legacy pre-0.11.4 standalone-task job row (no workflow wrapper)
    would never fire `onFailed` on final failure, because `reportsFinalFailure` is hardcoded `true` but
    Payload's synthetic single-task wrapper has no catch to call `reportFinalFailure` from. Re-verified
    independently (confidence 72): real on the facts, but reachability depends on an install still
    carrying unprocessed pre-0.11.4 job rows into this upgrade — worth a one-line check before release,
    not a blocking defect.
  - D5a's task.md "Mechanism" section (`jobsCollectionOverrides`/`afterChange`) describes an approach
    that was never built — shipped code computes finality inline in the workflow handler's own catch
    instead. Confirmed independently by three reviewers. Doc-accuracy only; the acceptance criteria it
    supports (6,7,7a,7b) pass via the real mechanism. (55)
  - A new reverse dependency edge: `task-runner/payload-jobs-runner/owedIfGaveUp.ts` imports `stillOwed`
    from `lifecycle/` — the first time task-runner has imported from lifecycle. Layering smell, no
    runtime circularity. (55)
  - `PayloadJobsTaskRunner.serve()`'s `handle === null` fallback is untested; existing unit tests weren't
    updated for the return-type change. Judged practically unreachable — Payload's `jobs.queue()` always
    resolves an id. (45)
  - `needsDecoration.ts` duplicates `withQueuedNotification.ts`'s hardcoded callback list with no
    structural tie — a future callback added to one without the other reproduces the bug criterion 13
    closed. Hypothetical, not present. (55)
  - `thrownByTheHandler.ts` has no test file; its `recallThrown` fallback branch is dead in context at
    its one call site. (40)
- **Needs-verification (handoff, never scored):** whether the consumer who filed #110 considers "onFailed
  fires once, final-only, no attempt field" sufficient, given they explicitly asked for an attempt
  counter and the contract records that need as deliberately unmet (Follow-ups).
- **Pin:** `3bcf7ce84574`, expires 24h
