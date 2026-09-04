# Task contract — bound the job scan on enqueue (#108)

Investigation and measurements: [#108 comment](https://github.com/focusreactive/payload-plugins/issues/108#issuecomment-5533106260).
Stacked on [#125](https://github.com/focusreactive/payload-plugins/pull/125) so the result can be verified on all three adapters.

**Risk: HIGH.** Touches a semi-public interface with four callers, and changes what `enqueue` deletes.

## Design decisions

**D1 — exclude completed jobs from the query; do not narrow by collection.**
Measured: excluding completed jobs takes the rows loaded per enqueue from 2000 to 0 at a 2000-job
history, and adding a collection filter on top changes nothing. Rejected: narrowing by
`input.collection_slug`, which buys nothing measurable and would silently drop every job written
before the ID-agnostic migration — `readCollectionRef` reads the slug from that field OR from the
legacy `input.collection.relationTo`, and a where clause sees only the first.

**D2 — `excludeCompleted`, not `pendingOnly`.**
`completedAt: { exists: false }` also returns running and failed jobs. A flag named for the `pending`
status would promise a narrower set than it delivers, and `enqueue` genuinely wants the wider one: a
failed job for the same (document, locale) is still superseded by a re-run.

**D3 — `documentIds` keeps being matched in memory, `excludeCompleted` goes into the query.**
The asymmetry is stated in the type. Without it the next person adds a third field and assumes all
three are equally cheap.

**D4 — the second parameter becomes a union, and the array form is deprecated rather than removed.**
`Array<string | number> | TaskFilter`, branching on `Array.isArray`. Rejected: replacing the array
outright — `TaskRunner` is reachable through the exported `TaskRunnerProvider.create()`, whose own
docblock anticipates third-party runners, and a removal would have to wait for the next major anyway.
The user's reason for the object is flexibility independent of this fix: a positional argument cannot
grow, an options object can.

**D5 — `cancel-by-collection` is deliberately not changed.**
It loads everything and filters `status === "pending"` itself. Passing the new flag would speed it up
by one line, but its route is already in DEPRECATIONS.md for replacement by a unified `/cancel`, and
it runs once per human click rather than once per document in a batch. Left alone to keep this diff
about the path where the cost actually lands.

**Placement:** `TaskFilter` beside `TaskRunner` in `TaskRunner.interface.ts` — it is part of that
contract and has no life without it. Both runners implement it; `withQueuedNotification` forwards it.

**New surface:** `TaskFilter`. Callers: `PayloadJobsTaskRunner.enqueue` and — through the union —
every existing caller of `findByCollection`. It is a type, not an abstraction over behaviour.

**`@since`:** `TaskFilter` carries `@since 0.11.2`. The user's call: this ships as a patch, so the
three commits stay `fix` / `docs` / `refactor` rather than being retyped to `feat` for the sake of the
new export or the new deprecation entry. It is not re-exported from `src/index.ts`,
but `TaskRunnerProvider.create(): TaskRunner` is, so a third-party runner must satisfy this type.

**Written contract owed:** yes — which fields reach the database and which are applied in memory, and
what `excludeCompleted` includes (running and failed, not only pending). Stated in the type's docblock.

**Escalate:** no. One module, no new dependency, no data-model change.

## Acceptance criteria

1. **The enqueue scan no longer grows with history.** An integration test seeds completed jobs and
   asserts the rows the enqueue path loads do not grow with them. *Check: integration test on SQLite.*
2. **Completed jobs survive a re-translation.** Translate a locale twice; the first job's row is still
   present afterwards. *Check: integration test.* Currently fails — today's `enqueue` deletes it.
3. **Unfinished jobs are still superseded.** A pending job for the same (document, locale) is still
   cancelled by a re-enqueue. *Check: existing unit tests must stay green.*
4. **The query still narrows by `taskSlug` and `completedAt` only** — never by collection slug or
   document id, so neither the SQLite coercion defect nor the legacy-shape loss returns.
   *Check: the existing `narrows the SQL where clause` unit test, extended.*
5. **The positional array form still compiles and behaves as before.** *Check: existing unit tests for
   both runners, unchanged, stay green.*
6. **`SyncTaskRunner` honours the same filter.** *Check: unit test.*
7. **The array form carries a real `@deprecated` tag** plus a DEPRECATIONS.md entry in that file's
   established format, so the next major's removal sweep can find it by grep.
8. **The rewritten comment states only what is true**, verified today: `in` versus `equals` on SQLite,
   Postgres and MongoDB handling everything, and accumulation under `deleteJobOnComplete: false`.
9. **All three adapters pass.** *Check: `test:integration:all`; Postgres still fails only the three
   auto-translate cases of #124.*
10. **Checks clean:** check-types both packages, unit tests, lint at the repo baseline.

## Human choices

- **Stop deleting completed jobs on re-enqueue.** The user's call, made knowing the consequence: the
  job table no longer self-prunes per (document, locale), which promotes #122 (retention) from low
  priority to needed. Rejected alternative: preserving today's behaviour by deleting duplicates with a
  where clause instead of loading them — which cannot express a numeric document id on SQLite.
- **Introduce `TaskFilter` regardless of whether this fix needs it**, and deprecate the positional
  array now. The user's reason is interface flexibility, not this optimisation.

## Risks

- **The table grows, and two polled endpoints read it.** `enqueue`'s delete used to prune per
  (document, locale), so the steady state was roughly one job per pair ever translated; it becomes one
  per translation *run*. `get-collection-status` and `get-document-status` both still read the table
  unpaginated on every poll, and the first serialises a row per job to the browser. Neither can adopt
  `excludeCompleted` — their content is the finished jobs. This is what turns #122 from tidiness into
  a bounded-read requirement, and #123 records the endpoints' own unbounded read.
- The union parameter lives until the next major. It is three lines and one `Array.isArray`.

## Review log

**2026-09-04 — comment audit.** 67 comment lines over 155 of code (4.3 per 10) judged too dense.
Deleted 6, rewrote 7. Caught a factual error: the rewritten rationale asserted a mechanism for the
SQLite drizzle defect ("the value is inlined without quotes") that a read of `parseParams.js`
contradicts for string values. Rather than adjudicate a mechanism that had already drifted within one
Payload version, the whole drizzle paragraph was dropped — the docblock's own two-stored-shapes reason
settles the question, and #108 holds the detail. A dangling reference to it in `reclaimStaleJobs` was
repointed. Verified and kept: `excludeCompleted` really is wider than the `pending` status, because a
job that exhausts its retries keeps `completedAt` null.

**2026-09-04 — whole-file comment audit of `PayloadJobsTaskRunner.ts`.** 88 comment lines over 147 of
code — 6.0 per ten. Deleted 6, rewrote 8, rewrote code twice, kept 1, added 1; the file is now at 49.
The diagnosis was not unreadable code but design-doc prose migrated into it: three of the four largest
blocks duplicated something with a canonical home (the deprecation ledger, issue #108, this file).

Two code changes came out of it. `cancelInternal` is renamed `cancelAndDeleteJobs` — it calls
`payload.jobs.cancel` **and** `payload.delete`, and the old name is what forced a comment defending
`excludeCompleted`. And the `jobs.cancel` + `delete` pair now says why both and why in that order:
`jobs.cancel` only writes `{ error: { cancelled: true }, hasError: true, processing: false }`, which is
the abort signal to a running handler, so a reader who sees the delete would otherwise conclude the
cancel is dead code.

**A second stale claim, found in the same file on the same day.** The eleven-line comment justifying
`jobs.run({ where })` over `payload.jobs.runByID({ id })` said the id path "writes `processing: true`
but returns no rows … leaving the job stuck forever". Checked against the installed payload 3.84.1:
`@payloadcms/drizzle/dist/updateJobs.js` takes the optimized upsert branch for `{ processing: true }`
and returns `[result]`, and the non-optimized branch findMany's by id and returns rows — neither
returns zero. **The deviation is still correct, for a different reason:** in
`payload/dist/queues/operations/runJobs/index.js` the guard block (`processing: false`, `hasError` not
true, `waitUntil` due) is built only for the non-id branch, so `runByID` would re-run a job that had
exhausted its retries. The comment now says that instead.

Worth recording as a pattern rather than two incidents: both stale claims described Payload's
internals, and both aged silently within a single minor version. A comment that transcribes another
package's implementation is a maintenance liability even when it is right on the day it is written.

**2026-09-04 — reuse, simplification, altitude.** Nothing re-implemented; no existing normalizer fits.
Five findings taken. `toTaskFilter` moved out of `TaskRunner.interface.ts` — five of the package's six
`*.interface.ts` files are types-only, and it was the one carrying runtime code — and is now exported
from `src/index.ts` beside `TaskRunnerProvider`, because the union puts the normalization obligation on
every third-party runner and half-exporting the tool that discharges it is the worst of both. AC7 was
reopened and met: a `@deprecated` tag *is* expressible as an overload pair, which my first pass wrongly
recorded as impossible. `SyncTaskRunner` now keys `excludeCompleted` on `completedAt` rather than
`status`: the two runners previously agreed only because `getJobStatus` happens to check `completedAt`
before `error`. The new spec lost a dead union branch, a redundant `collections` option and a missing
status assertion. The risk about table growth was sharpened to name the two polled endpoints that read
it.
