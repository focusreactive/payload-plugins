Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #3

# Step 3 — reading the run record

## Requirements / Task restatement

Step 2 made the plugin write its own record of every run. This step makes it *read* it: the five
routes that today ask the runner what it has — `/cancel`, `/run/:id`, `/cancel/:collection_slug`,
the document status panel and the collection status panel — ask the table instead.

`assignmentsOf` and `findByCollection` keep their place on the port; nothing calls them after this
step, and step 5 removes them. The wire shapes the admin reads do not change.

Covers R2 of the design, and finishes what R3 began — the panels now answer from a table Payload's
`deleteJobOnComplete` cannot empty.

## What already exists — platform · installed · project · verdict

- **Platform.** Payload's `find` takes `where`, `limit`, `sort` and `pagination`. Both reads this
  step adds are keyed by an index the collection already declares — `(collectionSlug, collectionId)`
  and `handle` — so neither needs a new one.
- **Installed.** Nothing new is added.
- **Project.** The five handlers already share two helpers that stay: `visibleIds` for the host's
  own read rule, and `authorisedHandles` for the write rule on a document. `PayloadRunRecordStore`
  already answers `find` and `findByDocument` — written in step 1 for exactly these callers.
- **Verdict.** Nothing new is designed. One concept is named for the first time: the status a row
  *implies*, which today is a column on someone else's job row.

## Decisions

**D1 — the collection panel keeps answering with rows, not three counts.**
This deviates from the plan sketch, which proposed three `count` queries. It cannot be done: the
panel's numbers are filtered through `visibleIds`, the host's own read rule on the *content*
collection, and a count has no ids left to filter. Counting server-side would show a user documents
they may not read. The rows stay, bounded by an explicit `limit` and sorted, which is what the
"bounded and index-backed" requirement was actually asking for.

**D2 — a cancelled row is not shown by either panel.**
Chosen: both reads drop rows whose outcome is `cancelled`. Lost: showing them. Today a cancelled run
is *deleted* from `payload-jobs`, so the panel has never shown one; keeping the display identical is
what makes this step a move rather than a behaviour change. The row itself stays, so the history is
there when the admin gains a word for it (#48). A locale cancelled while its work was in flight
still settles `delivered` and still shows — the later settlement wins, as step 2 established.

**D3 — status is derived in one place, from the row.**
`runStatus.ts` in the runs module: `outcome` set decides, else `startedAt` means running, else
pending. Lost: deriving it inside each handler. Two readers already exist, and the design's whole
point (D3) is that the vocabulary is derived rather than stored.

**D4 — three new store reads, each named for its question.**
`findByHandles(handles)` for the two routes that are handed handles; `findLiveInCollection(slug)`
and `findRecentlyFailedInCollection(slug, since)` for the two that ask about a collection. Lost: one
general `find(where)`, which would move the query shapes back out into the handlers and leave nothing
checkable in one place; and lost one combined collection read with an `or`, because the two halves
are asked for different reasons — work in flight is kept however old it is, a failure only inside the
window — and separating them makes each query say so.

**D5 — the handlers take a store factory; the two that stop or start work keep the runner.**
`/cancel` and `/run/:id` still call `cancel` and `run`, so they hold both. The two panels and
`/cancel/:collection_slug` hold the store and, for the last of those, the runner only to cancel.

**New surface.** Nothing is added to `src/index.ts`. `ConfigTimeContext` gains
`runRecordStoreFactory`, which `plugin.ts` fills from `configureRunRecord`. The shape check fired on
"a field is added to a type implemented outside this package" — it is not: `ConfigTimeContext` is
internal, built only by `plugin.ts`, and no published type mentions it.

**Written contract.** `findByHandles` owes callers something its signature cannot state: a handle no
row names is **omitted, never guessed** — the same rule `assignmentsOf` carries today, and the reason
is the same, an empty answer reads as "nothing left to cancel". AC11 pins it.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | The document panel answers from the table, asking the runner nothing | `bunx vitest run src/server/features/get-document-status/handler.test.ts` | exit 0, the cases run |
| AC2 | R2 | It shows one entry per target locale, the newest run for that locale | same file, `-t "per target locale"` | exit 0, the case runs |
| AC3 | R2 | A locale whose only row is cancelled is not shown | same file, `-t "cancelled"` | exit 0, the case runs |
| AC4 | R7 | The stored failure text reaches the client as stored, not sanitised a second time | same file, `-t "as it was stored"` | exit 0, the case runs |
| AC5 | R2 | The collection panel lists unsettled runs and failures inside the window, and nothing settled before it | `bunx vitest run src/server/features/get-collection-status/handler.test.ts` | exit 0, the cases run |
| AC6 | R2 | It still hides documents the caller may not read | same file, `-t "may not read"` | exit 0, the case runs |
| AC7 | R2 | `/cancel` places each handle through the table, and refuses the ones the rule refuses | `bunx vitest run src/server/features/cancel/handler.test.ts` | exit 0, the cases run |
| AC8 | R2 | `/run/:id` places its handle through the table and refuses one with no recorded requester | `bunx vitest run src/server/features/run-translation/handler.test.ts` | exit 0, the cases run |
| AC9 | R2 | `/cancel/:collection_slug` leaves a run alone while one of its locales is running | `bunx vitest run src/server/features/cancel-by-collection/handler.test.ts` | exit 0, the cases run |
| AC10 | R2 | Both collection reads are bounded and keyed by an index the collection declares | `bunx vitest run src/server/modules/runs/__tests__/store.test.ts -t "bounded"` | exit 0, the cases run |
| AC11 | R2 | A handle no row names is omitted from the answer, never guessed | `… store.test.ts -t "no row names"` | exit 0, the case runs |
| AC12 | R2 | On a real database the panels answer correctly after a run, with the queue emptied | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/run-record-read.int.test.ts` | exit 0, the cases run |
| AC13 | — | No new type errors | `bun run check-types` | 0 errors |
| AC14 | — | The package suite stays green and grows | `bunx vitest run` | ≥ 2673 passing, 0 failing |
| AC15 | — | No new lint findings | `bunx oxlint .` | 43 warnings, 0 errors |
| AC16 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC17 | — | Integration suites stay green on all three adapters | `apps/dev`: `bun run test:integration` ×3 | ≥ 241 / 247 / 239 passing, 0 failing |
| AC18 | R2 | A run between attempts reads as work in flight, not as a failure to act on | `apps/dev`: `… panel-shows-what-is-happening.int.test.ts -t "retrying"` | exit 0, the case runs |

## Pre-flight

Run against the tree as step 2 left it, on 2026-10-27.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1–AC12 | — | not run: nothing reads the table, so every criterion fails by construction. The five handlers' existing suites pass today against the runner and are the before-state AC14 counts | change |
| AC13 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC14 | `bunx vitest run` | **PASS** — 214 files, 2673 passing | invariant |
| AC15 | `bunx oxlint .` | **PASS** — 43 warnings, 0 errors | invariant |
| AC16 | `bunx turbo run build --filter=…` | **PASS** — measured at the end of step 2 | invariant |
| AC17 | `bun run test:integration` ×3 | **PASS** — SQLite 241 / 8 skipped, PostgreSQL 247 / 2, MongoDB 239 / 10 | invariant |

## Risk notes

- **The sync runner has no unsettled rows, ever.** It settles every locale inside `enqueue`, so the
  collection panel under `createSyncRunner` shows failures and nothing else. That is already true
  today and is not this step's to fix; it is the reason the integration spec for the panels uses the
  Payload Jobs runner with `autoRun: false`.
- **Double sanitising.** `toClientErrorMessage` must not run on the stored `error`: step 2 already
  ran it, and a second pass collapses a reason's own copy to the generic text because the
  re-authored copy carries no marker. AC4 is the check that holds this.
- **Rows accumulate where jobs used to be deleted.** The panels now read a table nobody prunes, so a
  query that was bounded by "live jobs" must be bounded by `limit` instead. AC10 is that check, and
  the window on failures is what keeps the collection read from growing without end.

## Review log

### Verification

| AC | Command | Result |
|---|---|---|
| AC1–AC4 | `bunx vitest run src/server/features/get-document-status/` | **PASS** — 13 handler cases, 4 model cases, 3 route cases |
| AC5, AC6 | `bunx vitest run src/server/features/get-collection-status/` | **PASS** — 8 handler cases |
| AC7 | `bunx vitest run src/server/features/cancel/` | **PASS** — 10 + 6 cases |
| AC8 | `bunx vitest run src/server/features/run-translation/` | **PASS** — 8 + 4 cases |
| AC9 | `bunx vitest run src/server/features/cancel-by-collection/` | **PASS** — 9 + 4 cases |
| AC10, AC11 | `bunx vitest run src/server/modules/runs/__tests__/store.test.ts` | **PASS** — 20 cases |
| AC12 | `apps/dev`: `… run-record-read.int.test.ts` | **PASS** — 7 cases |
| AC13 | `bun run check-types` | **PASS** — 0 errors |
| AC14 | `bunx vitest run` | **PASS** — 216 files, 2694 passing (from 2673) |
| AC15 | `bunx oxlint .` | **PASS** — **37** warnings, 0 errors (from 43; see below) |
| AC16 | `bunx turbo run build --filter=…` | **PASS**; `bunx turbo run check-types` 9/9 |
| AC17 | `bun run test:integration` ×3 | **PASS** — SQLite 246 / 10 skipped, PostgreSQL 252 / 4, MongoDB 244 / 12 (from 241 / 247 / 239, 8 / 2 / 10 skipped) |
| AC18 | `apps/dev`: `… -t "retrying"` | **PASS** |

The lint count **fell** rather than held. Four handlers declared their dependencies as constructor
parameter properties, which the linter has always objected to; adding a second dependency to each
would have added four more warnings, so all four were converted to explicit class properties —
the style `GetCollectionStatusHandler` already used. Six warnings went with them.

### Mutations

Eighteen mutations, each applied to the implementation alone, the affected specs run, and the file
restored from a copy with the restore verified by comparison.

| | What was broken | Went red |
|---|---|---|
| N1 | a cancelled row gets a word after all | 4 checks, across the derivation and the document panel |
| N2b | the stamp is read before the outcome | reads the outcome over the stamp |
| N3 | running and pending are swapped | 3 derivation checks |
| N4b | a run is named once per locale instead of once per run | answers once per run · names each run once |
| N5 | half a requester is reported as a whole one | names nobody when half the requester is missing |
| N6 | the collection read stops narrowing by settlement | asks for the work in flight by the absence of a settlement |
| N7 | the failure window is dropped | asks for recent failures by outcome and moment |
| N8 | a read loses its bound | bounds every read |
| N9 | an empty handle list still asks the database | asks nothing at all when no handle was named |
| N10 | the document panel stops dropping rows it has no word for | 6 checks |
| N11 | the newest run for a locale stops winning | keeps the run queued most recently · keeps one entry per locale |
| N12 | the stored failure text is cleaned a second time | hands the text on as it was stored |
| N13 | the collection panel stops asking about the failure window | 2 checks |
| N14 | the collection panel stops hiding what the caller may not read | hides a document the caller may not read |
| N15 | a started run is no longer protected from a collection-wide cancel | 3 checks |
| N16 | `/run` stops refusing a run nobody is recorded as having started | refuses a job nobody is recorded as having started |

**Two mutations did not bite, and both were real findings.**

1. **N2** — the first attempt moved a `running` guard *below* the outcome checks, which changes
   nothing for any row the system actually produces. Re-aimed above them (N2b), and the check
   reddened. The check was sound; the mutation was not.
2. **N4** — removing the `if (byHandle.has(row.handle)) continue;` from `assignmentsFromRows`
   reddened nothing, because the `Map` is what deduplicates and the `continue` only chose which of a
   run's identical rows won. The guard was dead weight dressed as a rule, and its docblock asserted
   that rule. Both removed; N4b then reddened the checks by replacing the `Map` with an array.

### The review passes

**Complexity.** Scenario taken from history: *the collection panel gains another narrowing*, which
happened in 0.17.0 when `excludeGivenUpBefore` was added. Before this step that cost five edits —
`TaskFilter`, `toTaskFilter`, both runners' `findByCollection`, and the handler. After it, three —
the store method, its `where`, and the handler. READ does not rise: the query is in one place
instead of two implementations. No separate finding was admitted; the step is itself the fix.

**Abstraction.** One finding, applied: `RunRecordStore.find(key)` had no caller. Step 1 wrote it for
"the routes", and the routes turned out to need `findByHandles` and `findByDocument` instead.
Checked mechanically rather than by eye, and removed with its two checks; four lines to write again
if step 6 wants it. Everything else on the interface now has a named caller.

**Comments.** Every block in the diff was judged; one was deleted — `assignmentsFromRows` claimed
"the first row met answers for the run", which mutation N4 proved to be describing nothing. The
behavioural claims were checked rather than taken on trust: both collection reads lead on
`collectionSlug`, which is the leading column of the compound index the collection declares, and
`handle` and `settledAt` each carry their own, so "index-backed" is true as written.

### Deviations from the contract

1. **The collection panel answers with rows, not three counts (D1, as designed).** Recorded under
   Decisions before any code was written: a count has no ids left for `visibleIds` to filter.
2. **Three store reads, not two.** The collection read split in half, for the reason now written
   into D4.
3. **Two integration checks are skipped, not deleted.** `status-reads-are-bounded.int.test.ts` kept
   two cases about jobs written in the legacy relationship shape. The panels no longer read job
   rows at all, so a job queued before the upgrade is invisible to them until step 6 adopts it —
   which is exactly what the design's build sequence says (R8 is step 6's). They are `it.skip` with
   a comment naming the step that must restore them, rather than removed.

### Findings carried forward

- **A locale between attempts now reads as `running` where it read as `pending`.** The record is
  told a locale failed only when the run gives up (`owedIfGaveUp`), so a row whose handler was
  called and has not come back is indistinguishable from one being translated right now. Two
  consequences, both now pinned by checks: the panel shows such a locale as Translating rather than
  Queued, and `DELETE /cancel/:collection_slug` leaves its run alone, because one started locale
  protects the whole run. The per-handle `DELETE /cancel` still reaches it. Closing this needs a
  fact the port does not carry — that an attempt ended — and that is new surface, not this step's.
- **`JobStatusOutput.cancelled` is now always `false`.** Neither panel shows a cancelled row (D2),
  and no client has ever read the field. It is a candidate for step 5's deprecation sweep.
- **`assignmentsOf` and `findByCollection` now have no production caller.** They stay on the port
  until step 5 removes them; `SyncTaskRunner` and `PayloadJobsTaskRunner` still implement both, and
  their own specs still cover them.
