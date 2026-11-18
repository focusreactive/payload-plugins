Requirements: ./2026-11-16-the-client-stops-naming-the-run.md

# Cancel and run, addressed by document

Builds the decision recorded in `./2026-11-16-the-client-stops-naming-the-run.md`. That document's
decisions are settled by the owner and are not reopened here; this file numbers them, says where
each lands, and states how each is checked.

Every `file:line` below was read on 2026-11-17 at `a8c66cd5`.

## Task restatement

Two routes take a run handle today — `DELETE {basePath}/cancel` in its body, and
`POST {basePath}/run/:id` in its path. A handle is minted by whichever runner is installed
(`PayloadJobsTaskRunner.ts:95`, `SyncTaskRunner.ts:32`, both `crypto.randomUUID()`), so the admin
addresses work by a name the runner invented, and a host writing its own runner must mint the same
kind of name for the admin to keep working.

Both routes move to addressing by document — collection slug plus document id — and the handle
stops crossing to the client at all. The two cancel routes become one, because the `select_all`
flag the enqueue route already uses expresses "the whole collection" without a second route.

The handle does not disappear: it stays the runner's internal name, and the server still hands it
to `runner.stop()`. What changes is that nothing outside the server ever sees it.

## Requirements

- R1 (in) Cancel is addressed by document: `{ collection_slug, collection_id, select_all? }`, with
  `collection_id` a required non-empty list, and `select_all` meaning the whole collection. The
  field names are the ones the enqueue route already uses, so the two routes name the same two
  values the same way.
- R2 (in) Run-now is addressed by document, following the path shape the package already uses for
  document-addressed routes.
- R3 (in) `DELETE {basePath}/cancel-by-collection/:collection_slug` is removed.
- R4 (in) The run handle is gone from both status payloads, so no host can build on it.
- R5 (in) The admin calls both routes by document and no longer holds a handle.
- R6 (out) Removing the `cancel-by-collection` member of the published `TranslatorAction` union. It
  ships `@since 1.0.0`, and a host's access guard refuses an action it has not answered for, so
  removing the member breaks a guard already written against 1.0. It waits for 2.0.
- R7 (out) Closing the stale-click race — a click on a row the user has been looking at cancels
  whatever run is live now. Recorded in the source document with its reasoning.
- R8 (in) The ledger entry `cancel-by-collection-route` moves to `removed`, and its three false
  statements are struck rather than deleted.
- R9 (in) The runner port and the routes above it stop calling a run a "job". The word survives only
  where a Payload Jobs row is actually meant — inside `payload-jobs-runner/`, and where the prose
  names Payload's own `jobs` config. Added at the owner's request once this work left the admin
  holding no handle, since the names were the last place the queue's vocabulary still showed.

## What already exists — platform · installed · project · verdict

- **Platform.** Nothing new from Payload.
- **Installed.** Nothing added.
- **Project.** Three things this work reuses rather than invents:
  - the `select_all` idiom — `enqueue-translation/model.ts:20-21` for the shape, `handler.ts:109-124`
    for the branch, including the exact pair of store reads this needs;
  - both store readers already exist: `findLiveForDocuments(collectionSlug, ids)` and
    `findLiveInCollection(collectionSlug)` (`RunRecord.store.ts:38,173,179`);
  - the document-addressed path shape — `document/:collection_slug/:collection_id`
    (`get-document-status/route.ts:22`) and `stale/:collection_slug/:collection_id`
    (`staleness/route.ts:18`).
- **Verdict.** Nothing new is designed. One route gains a field and a collection check, one route
  changes its path, one route goes, and the client stops carrying a value it already duplicates.

## Decisions

**D1 — the run-now path is `POST {basePath}/run/:collection_slug/:collection_id`.**
Chosen over a body-carried document and over `run/:collection_slug/:collection_id` under a new
prefix. The package already addresses a document exactly this way in two routes
(`get-document-status/route.ts:22`, `staleness/route.ts:18`); a third spelling would make the
reader check which. Run-now keeps its own route rather than folding into cancel, because the two
do opposite things.

**D2 — `select_all` picks the store read, and nothing else.**
`select_all` raised → `findLiveInCollection(slug)`; otherwise → `findLiveForDocuments(slug, ids)`.
That is the same pair enqueue already branches on (`enqueue-translation/handler.ts:122-124`). The
rejected alternative was resolving `select_all` into a document-id list first and then taking one
path: it costs an extra read of the target collection to produce ids that the runs query does not
need.

**D3 — access is asked per document in both branches.**
Lost: mirroring enqueue, which trusts the read filter under `select_all`
(`enqueue-translation/handler.ts:110-114`). That shortcut is sound there because
`getAllCollectionIds` applies `enforcedAtTheRead(user)` to the **target** collection
(`shared/payload/collections.ts:16`). Cancel's whole-collection branch reads `translator-runs`
instead, where no filter about the target documents has been applied — so trusting it would cancel
runs on documents the caller may not see. `authorisedHandles` stays on both paths.

**D4 — the client drops `jobId`; the row's `state` already carries what it was used for.**
`statusRows.ts:91` sets `jobId: runOwned ? run.id : undefined`, and `rowActions.tsx:60-63` treats
`jobId === undefined` as "no action here". So the field carries two meanings: the address, and
whether the run owns the row. The second is `isRunOwned(row.state)`, computed from a value the row
already has (`statusRows.ts:10,86`). Removing `jobId` therefore loses no information: the address
becomes the document the panel is already rendering for, and the predicate moves to `state`.
Rejected: keeping `jobId` as a pure actionability flag — a boolean named after an identifier.

**D5 — the collection panel's cancel button means the whole collection, and sends no selection.**
First built the other way — handed the list view's selection — and corrected during review. The
button sits beside a collection-wide "Queued" count and is drawn whenever that count is non-zero,
so with nothing selected it would have sent an empty list and been refused. The scope a person sees
and the scope sent must be the same one. It sends `select_all: true` and nothing else. Rejected:
drawing the button only when something is selected — it removes the one-click "cancel everything"
the panel exists to offer.

**D6 — `collection_id` is required and non-empty only when `select_all` is absent.**
Decided by the owner once D5 showed the cost of demanding it always. A request still cannot ask for
nothing: it names documents, or it names the collection. Rejected: keeping the list required and
having the panel send a placeholder — a value invented to satisfy a schema that then ignores it.

**D7 — the refusal names documents, not run handles.**
`authorisedHandles` answers in handles, which was harmless while the caller supplied them. Under
`select_all` the server resolves runs the caller never named, so returning their handles would
publish the very thing this work removes from the wire. The handler maps them back to document ids.

**D8 — run-now reads the document's runs, not only its live ones.**
`findByDocument` (newest first), not `findLiveForDocuments`. Found during review: Retry is offered
on a `failed` or `abandoned` row, and both of those are settled by the time the row says so
(`runStatus.ts:19`, `RunRecord.types.ts:44-45`), while the live reader filters settled rows out.
Addressed by handle this never arose, because that reader had no such filter. Keeping the live
reader would have made Retry answer 404 every time.

**D9 — a run with a locale already started is no longer spared.**
Carried from the source document, which settled it: the old collection route skipped such runs, and
the merged route does not. Cancelling never stopped work in flight, so sparing them only withheld
the record of the request. Recorded here because this contract previously left it unstated.

**D10 — the port's word for the thing is "run", not "job".**
`JobHandle` → `RunHandle`, `JobAssignment` → `RunAssignment`, `authorisedHandles({ jobs })` →
`({ runs })`, the brand symbol `jobWasAskedAbout` → `handleWasAskedAbout`, and the locals in the
run-now handler. The port's own docblock already said the handle names *a queued run*
(`task-runner/types.ts:17-19`), and the whole record layer is `RunRecord` / `RunIdentity` /
`RunOutcome` over a `translator-runs` collection — so "job" named nothing the port has. It is also
false for a runner that keeps no queue: `SyncTaskRunner` translates inline and mints its handle
with `crypto.randomUUID()` (`SyncTaskRunner.ts:34`), so there is no job to find. Rejected: renaming
only the locals in the run-now handler, which hides the word one call deeper instead of removing
it. No published name changes — `RunHandle` and `RunAssignment` are not re-exported from
`src/index.ts`, and the published conformance suite already spoke in handles.

**D11 — `JobIdSchema` becomes `DocumentIdSchema`, in its own file.**
It validates a Payload document id and nothing else: all six callers parse `collection_id` or
`doc_id`, none parses a handle. Its own docblock admitted the confusion, reading "document/job ID".
Rejected: leaving the name and correcting only the docblock — the name is what a caller reads at
the call site.

**D12 — two dead names are removed rather than renamed.**
`Task` (`task-runner/types.ts`) and `TranslationTaskStatus` (`get-document-status/model.ts`) have no
reader; `Task` was also listed in the module barrel, which the package guide forbids for a name
nothing outside the module takes.

**New surface.** None. The shape check fired twice: a field added to the cancel request schema (D2
and D6, with the field names settled as the enqueue route's own — `collection_slug`,
`collection_id`, `select_all`), and a parameter set added to a React component, which D5 then
removed again.

**Written contract.** None — nothing here owes a caller something its signature cannot state.

**D6 — the request field names are the enqueue route's.**
`collection_slug`, `collection_id`, `select_all`, not the shorter `collection` / `ids` the source
document sketched. Decided by the owner at the gate: two neighbouring routes taking the same two
values under different names is a cost every reader pays, and `select_all` only reads as the same
idiom if what it overrides is spelled the same way.

**Escalate?** No. The placement is decided by the house path convention and by an idiom the package
already runs; no new seam.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | Cancel names documents, not handles: a request naming two documents stops exactly the live runs of those documents | `bunx vitest run src/server/features/cancel/__tests__` | exit 0; the case asserts `runner.stop` received the handles of those documents' live runs |
| AC2 | R1 | `collection_id` is required and non-empty | same suite | exit 0; a body with `collection_id: []` and a body with no `collection_id` are both answered 400 |
| AC3 | R1 | `select_all` cancels the collection's live runs and ignores `collection_id` | same suite | exit 0; the case asserts the whole-collection store read was used and the named ids were not |
| AC4 | R1, D3 — **negative** | A caller who may not update a document does not cancel its run, in **both** branches | same suite | exit 0; one case per branch asserts the refused document's handle never reached `runner.stop` |
| AC5 | R1 | A collection the plugin does not manage is refused | same suite | exit 0; answered 400 |
| AC6 | R2 | Run-now is addressed by document at the house path | `bunx vitest run src/server/features/run-translation/__tests__` and `grep -n "path:" src/server/features/run-translation/route.ts` | exit 0; the path reads `${basePath}/run/:collection_slug/:collection_id` |
| AC7 | R2 — **negative** | Run-now on a document with no run at all is a 404, not a silent success | same suite | exit 0, the case runs |
| AC7b | D8 — **negative** | Run-now reaches a run that has already settled, which is what Retry is for | same suite | exit 0; the case asserts `runner.run` received the settled run's handle |
| AC8 | R3 | The second cancel route is gone | `test ! -d src/server/features/cancel-by-collection` and `grep -rn "cancel-by-collection" src/server src/client` | directory absent; the only matches are the published action name and the test that pins it as routed by nothing |
| AC9 | R4 | Neither status payload carries the run handle | `grep -n "row.handle" src/server/features/get-document-status/model.ts src/server/features/get-collection-status/handler.ts` | no match |
| AC10 | R4, R5 | The client holds no handle anywhere | `grep -rn "jobId" src/client` | no match |
| AC11 | R5 | The row's actions still appear exactly when the run owns the row | `bunx vitest run src/client/entities/translation` | exit 0; a case asserts an action is offered for a run-owned state and withheld for `translated` |
| AC12 | R5, D5 | The collection panel's cancel asks for the whole collection, whatever is selected | `grep -n "mutateAsync" src/client/features/collection-translation-progress/ui/CollectionTranslationProgress.tsx` and `grep -n "select_all" src/client/entities/translation/api/mutations/useCancelCollectionTranslations.ts` | the panel passes only the collection; the request body raises `select_all` |
| AC13 | R8 | The ledger entry reads `removed`, and its three false statements are struck, not deleted | `grep -n -A20 "^### cancel-by-collection-route" docs/DEPRECATIONS.md` | `**Status:** removed`; the `POST`, the "differing only in the where-clause shape" reason and the `{ ids } \| { collection }` replacement each survive inside `~~…~~` with a correction beneath |
| AC19 | R9, D10 | The word "job" survives only where a Payload Jobs row is meant | `grep -rniE "\bjobs?\b" src --include="*.ts" --include="*.tsx" \| grep -v payload-jobs-runner` | every remaining line names Payload's own jobs queue or config, and none names the port's handle, record or route |
| AC20 | R9, D11 | The document id schema is named for what it validates | `grep -rn "JobIdSchema" src` | no match |
| AC14 | — | No new type errors | `bun run check-types` | 0 errors |
| AC15 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC16 | — | No new lint findings | `bunx oxlint .` | ≤ 33 warnings, 0 errors |
| AC17 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC18 | — | The sandbox suite stays green against a real Payload boot, exercising the new routes end to end | `apps/dev`: `bun run test:integration:sqlite` | 0 failing |

## Pre-flight — each check run against the untouched tree, 2026-11-17

| AC | Result | Kind |
|---|---|---|
| AC1–AC5 | not run — `src/server/features/cancel/__tests__` has no case naming a document; cancel takes handles today | change |
| AC6 | **FAIL** — `run-translation/route.ts:22` reads `${basePath}/run/:id` | change |
| AC7 | not run — today the 404 is for a handle, not a document | change |
| AC8 | **FAIL** — the directory exists and is referenced from `createTranslationRoutes.ts` and the client | change |
| AC9 | **FAIL** — `get-document-status/model.ts:89` and `get-collection-status/handler.ts:58` both emit `id: row.handle` | change |
| AC10 | **FAIL** — `jobId` appears in `statusRows.ts` and `rowActions.tsx` | change |
| AC11 | expected PASS after the change; today the behaviour exists but is keyed on `jobId` | change |
| AC12 | not run — the panel sends only the collection slug today | change |
| AC13 | **FAIL** — the entry reads `planned`, and the ledger has no `~~` in it | change |
| AC19 | **FAIL** — 121 lines outside `payload-jobs-runner/` name a job, most of them the port's own types | change |
| AC20 | **FAIL** — 44 matches | change |
| AC14 | **PASS** — 0 errors | invariant |
| AC15 | **PASS** — 222 files, 2626 passed, 9 skipped | invariant |
| AC16 | **PASS** — 33 warnings, 0 errors | invariant |
| AC17 | **PASS** — exit 0 | invariant |
| AC18 | **PASS** — 61 files passed / 4 skipped; 241 passed / 7 skipped | invariant |

## Risk

**High.** Cancel is permission-gated and D3 changes how permission is established on the
whole-collection path; the plugin's HTTP surface changes shape, and a host's own client calling
these routes will break. Consequences for this run: tests are required rather than optional
(AC1–AC7, AC11, AC12), the Phase 4 sweep names what was searched and how many call sites were read,
and Phase 5 uses three review angles.

### Risk notes

- **A host calling these routes directly breaks.** The route shapes are the plugin's public HTTP
  surface even though the request types are not exported from the package entry. This is a major
  version, and the change belongs in its `BREAKING CHANGE:` footer.
- **The status payload types are internal**, which is what makes R4 cheap: `DocumentStatusItem`,
  `CollectionStatusItem` and `GetCollectionStatusOutput` are not re-exported from `src/index.ts`,
  so dropping a field from them is not a published-type break.
- **`select_all` over more than 500 live runs cancels only 500, and answers 204.** Every read of
  the run record is capped at `MOST_ROWS_ONE_READ_ANSWERS` and truncates silently
  (`RunRecord.store.ts:44-47,223`). This predates the change — the route it replaces had the same
  cap — but it now sits behind a button that says "cancel everything". Paging the store is its own
  piece of work and is not attempted here.
- **`RunRecordStore.findByHandles` has no production caller left** after this change. It stays for
  now; removing it is a separate tidy.
- **The `cancel-by-collection` action member outlives its route** (R6). A host guard answering for
  it keeps working; nothing dispatches it.
