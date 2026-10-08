# Task contract — unbundle the request-scope slice

`server/shared/payload/RequestScope.shapes.ts` accumulated four unrelated jobs behind one name, and
the directory holding it accumulated files that are not shared. Neither is a defect anyone can point
at in a bug report; both are the kind of drift that is only ever cheap to fix before the next change
lands on top.

**Risk: LOW.** No behaviour changes. Every step is a move, a rename, or a type reshape whose wire
format is unchanged. The suite is the instrument: 1589 unit checks and 155 integration checks already
cover this code, and none of them should need editing except for import paths and the one type.

## The finding

### The file breaks the package's own convention

`packages/payload-plugin-translator/CLAUDE.md` defines `.shapes.ts` as *"narrow structural
shapes (Payload-type slices)"* — types that keep god-`Config`/`CollectionConfig` out of leaf helpers.
Measured across all four such files in the package:

| File | exported functions | `payload` import |
|---|---|---|
| `OpenAI.shapes.ts` | 0 | none |
| `AutoTranslate.shapes.ts` | 0 | `import type` |
| `Provenance.shapes.ts` | 0 | `import type` |
| **`RequestScope.shapes.ts`** | **5** | **`import { APIError }` — a value** |

It is the only one that ships runtime code, and the only one that takes a runtime dependency on the
framework — the precise thing the convention exists to prevent.

### It holds four jobs whose consumers do not overlap

| Job | Exports | Consumers |
|---|---|---|
| carry the scope | `RequestScope`, `freshReq` | 12 and 5 |
| derive identity at the boundary | `identityOf`, `authCollectionsOf` | exactly 2, the same two |
| read an error | `killedTheCallersTransaction` | 5, none of which call `identityOf` |
| narrow the type | `Requester`, `isAttributed` | 1 |

**The tests already split it the way the code does not.** `identityOf.test.ts` exists while
`identityOf.ts` does not — whoever wrote it reached for `identityOf` as a unit, because it is one.
`RequestScope.shapes.test.ts` covers three entirely different exports.

### The type admits a state that does not exist

`userId` and `userCollection` are two independent optionals, so `{ userId: 7, userCollection: null }`
type-checks. It means nothing: a requester is known or is not. `isAttributed` exists only to paper
over that, and every reader has to call it.

### The directory is named for what it touches

`server/shared/payload` sits beside `access`, `guards`, `http`, `utils`, `validation` — every one of
which is named for a responsibility. "Shared things that touch Payload" refuses nothing; any new
file touching Payload qualifies. Two of its four files have a single consumer, so they are not shared
at all. It is also the only subdirectory with no `index.ts`, and the only one `server/shared/index.ts`
does not re-export.

## Decisions

**D1 — `RequestScope.shapes.ts` keeps only the type and `freshReq`.**
That is the part that is genuinely shared (12 and 5 consumers) and genuinely a shape. With the other
four exports gone the file has no `payload` import at all, which is what makes the name honest again.

**D2 — `identityOf` and `authCollectionsOf` move to `identityOf.ts`.**
Two exports, the same two consumers, one job: turn a request into an identity at the boundary. The
file name is not a choice — `identityOf.test.ts` already names it.

**D3 — `killedTheCallersTransaction` moves to its own file.**
It is the sole reason the slice imports `APIError` as a value. Isolating it is what restores D1.
Rejected: fold it into `http/withErrorHandler.ts` — it is not about HTTP, and two of its five
consumers are not handlers.

**D4 — the two single-consumer files move next to their consumer.**
`translationPermission.ts` and `TranslationRefused.ts` are each imported by exactly one file,
`features/translate-document/handler.ts`, and move into that feature. A file with one consumer is not
shared; keeping it under `shared/` is what made the directory look like a bucket.
Rejected: move `translationPermission.ts` to `shared/access/`. That directory is the *endpoint* gate;
this is the *document* rule. Two different meanings of "access" under one name is how the next bag
starts.

**D5 — the half-identity collapses into one optional object.**

    RequestScope = { transactionID?; requester?: Requester | null }
    Requester    = { userId: string | number; userCollection: string }

`isAttributed` disappears: `scope.requester` is present or it is not, and a plain null check narrows
it. The impossible state stops being representable, so no reader has to guard against it.

**The stored format does not change.** A queued job row already carries two flat columns,
`requester_id` and `requester_collection`; the collapse happens in memory only, and the one place
that rebuilds a scope from a row (`PayloadJobsRunnerProvider`) becomes the single site that decides
whether an identity is present. Rows queued before this change are read exactly as before.

**Placement:** no new directory. `server/shared/payload/` gains `identityOf.ts` and
`killedTheCallersTransaction.ts`, and loses two files to
`features/translate-document/`.

**New surface:** `RequestScope` and `Requester` are now exported from `src/index.ts`
(`@since 0.14.0`). This corrects a claim this contract originally got wrong: the type was already
reachable from the published type graph as the second parameter of `TaskRunner.enqueue` and of
`TaskHandler`, both carried by the exported `TaskRunnerProvider` — so a third-party runner had to
accept a type it could not name. Reshaping it is therefore a breaking change for such a runner, not
an internal one, and the export is what makes the parameter nameable.

**Escalate?** No new seam, no data-model change, no behaviour change — but see **New surface**:
the reshaped type is public, so the release decision is not a patch.

## Acceptance criteria

1. **`RequestScope.shapes.ts` imports nothing from `payload`**, and exports only the request-scope
   type, the `Requester` type, and the two functions that belong beside them — `freshReq` and
   `asRequester`. A constructor lives with the type it builds, as `makeIdPath` does with `IdPath`.
   *Check: `grep` for `from "payload"` in the file — zero hits; `grep -c '^export function'` — 1.*
   Fails now.
2. **`identityOf.ts` exists** and `identityOf.test.ts` imports from it rather than from the slice.
   *Check: the file exists; `grep` in the test.* Fails now.
3. **`shared/payload/` holds no file with a single consumer.** *Check: for each file, count importers
   outside the directory.* Fails now (two such files).
4. **The impossible state is unrepresentable:** no type in the package declares `userId` and
   `userCollection` as independent optionals, and `isAttributed` is gone.
   *Check: `grep -rn "isAttributed"` — zero hits.* Fails now.
5. **Behaviour is unchanged**, proved by the existing suite rather than asserted: unit 1589 in 130
   files, integration 155 on PostgreSQL and 149 + 6 adapter-skipped on SQLite and Mongo, both queue
   modes. No check may be edited except for an import path or D5's type.
   *Check: the runs, plus `git diff` over the test files shows only import and type edits.*
6. **A job queued before the change still runs**, because the stored columns are untouched.
   *Check: `access-control-queue.int.test.ts` on PostgreSQL, plus a diff of the job input schema
   showing `requester_id` / `requester_collection` unchanged.* Passes now and must keep passing.
7. **Checks clean:** check-types across all five workspaces, lint at the 58-warning baseline, build
   green with 0 extensionless specifiers in `dist` and the entry loading under Node.

## Human choices

- **Done now rather than after #144 merges.** Raised as a risk — it mixes a file reshuffle with an
  access-control change under review — and overruled deliberately: this is drift that compounds, and
  the next change lands on top of it.

## Review log

- 2026-09-25 — contract written; the five-point shape was agreed before it.
- 2026-09-25 — implemented. All seven criteria measured:

  | AC | measured |
  |---|---|
  | 1 | `RequestScope.shapes.ts`: 0 `payload` imports, 1 exported function |
  | 2 | `identityOf.ts` exists; `identityOf.test.ts` imports from it |
  | 3 | consumers per file — `RequestScope.shapes` 9, `killedTheCallersTransaction` 3, `sourceDocument` 3, `identityOf` 2. None with one |
  | 4 | `isAttributed` — 0 hits in the package |
  | 5 | unit 1583 in 131 files at the time of that run; integration 155 on PostgreSQL and 149 + 6 adapter-skipped on SQLite and Mongo, both queue modes — six runs, identical to the numbers before the change. **Superseded:** the suite is now 1599 in 132 files after the `asRequester` and round-trip checks below |
  | 6 | `types.ts` shows no edit to `requester_id` / `requester_collection` |
  | 7 | check-types 5/5 workspaces, lint 58, build green, 0 extensionless in `dist`, entry loads under Node |

  **The unit count moved 1589 → 1583 (+1 file), and every one of the six is accounted for.**
  `describe("isAttributed")` held them: one case asserting both halves present, four `it.each` rows
  over half-written identities, and one over a zero id. The first five describe states D5 makes
  unrepresentable — they can no longer be written down, let alone asserted. The sixth, the zero id,
  is the only real risk in that block and it already lives in `identityOf.test.ts` ("keeps a zero
  id"), so nothing was dropped. The +1 file is `killedTheCallersTransaction.test.ts`: its five checks
  moved verbatim with the unit they cover.

  No check was edited except for an import path, a `vi.mock` path, or D5's object shape — verified by
  filtering those out of `git diff -- '*.test.ts'` and finding nothing else.

### 2026-09-25 · sp-review-deep · target=working-tree vs ed3460cc (packages/payload-plugin-translator + apps/dev)
- **Vectors:** core (correctness · regression · intent) + security · contracts-types · architecture-fit · tests · abstractions-solid — dropped by cap: conventions
- **Rounds:** 1 parallel 8-vector fan-out + 1 confidence-scoring batch + opus adversarial pass + 1 narrow follow-up fan-out (loop-until-dry, stopped after 3 rounds when the reopening count failed to fall: 3 → 1 → 2)
- **Findings:** 8 distinct after dedup (≈22 raw mentions across reviewers) · 3 dropped (low confidence: <75) · 1 investigated-and-refuted (not a confidence judgment — a factual claim checked against Payload's own source and found false) · 3 reported (fix=off, so nothing was auto-fixed) · 0 unresolved
- **Reported:**
  - `RequestScope.shapes.ts` now exports 2 functions (`asRequester`, `freshReq`); AC1 as literally written requires 1, and this Review log's own prior entry still records "1 exported function" — stale. Same staleness: AC5's row here claims "unit 1583 in 131 files" (now 1591, `asRequester`'s own test block was never counted), and this doc's Placement paragraph promises `server/shared/payload/index.ts`, which does not exist in the working tree and whose absence (or reversal) this log never recorded.
  - `RequestScope`'s shape change (the `{userId,userCollection}` → `{requester}` collapse) reaches the package's public type graph through `TaskRunnerProvider`/`TaskRunner` (exported from `src/index.ts`, documented in README as the required `runner` config, explicitly inviting third-party implementations) — contradicting this doc's own `**New surface:** none` / `**Escalate?** No` claims. The leak itself predates this diff, but a third-party runner built against the old shape now silently degrades to `checkTranslationPermission`'s `!requester → ALLOW_ALL` (permission check skipped) rather than failing to compile, because a variable-typed scope object bypasses TypeScript's excess-property check.
  - The identity round-trip through the stored job row (`requesterOf` in `PayloadJobsRunnerProvider.ts`; the two write sites in `PayloadJobsTaskRunner.ts`) has zero unit-test coverage on both sides — proven by mutation (hardcoding any of the three to `null`/no-op leaves the full 1591-test unit suite green). The only guard is a Postgres integration test no CI workflow runs.
- **Left open:**
  - Out-of-scope follow-up: `killedTheCallersTransaction.test.ts`'s "MongoDB zero transaction id" case doesn't match either shipped adapter's real behaviour and inverts Payload's own truthy check in `killTransaction.js` — pre-existing (moved verbatim from `ed3460cc`), not introduced here.
  - Dropped at the confidence gate (real per multiple reviewers, scored <75 by an independent re-check): the `asRequester` JSDoc's "producers cannot disagree" claim vs. `identityOf.ts`'s pre-existing truthy `if (user.collection)` gate (scored 50 — practically-unreachable trigger); the duplicate derivation of `requester_id`/`requester_collection` in `PayloadJobsTaskRunner.ts`'s `queueWorkflow` vs. the already-computed `RequestShape` (scored 60 — latent, not a live bug).
- **Pin:** not set — the target is a shared working tree carrying two other people's uncommitted work; a stale-review gate would block them (explicit instruction for this run).

- 2026-09-25 — the deep review's three findings answered, and the numbers this contract had drifted
  from corrected.

  **The public surface was misstated, and is now fixed rather than re-explained.** `RequestScope`
  reached the published declarations as `TaskHandler`'s and `TaskRunner.enqueue`'s `scope` parameter
  while being absent from `dist/index.d.ts` — measured, 0 hits before, 2 after. Both types are now
  exported with `@since 0.14.0`. The hazard was concrete: a third-party runner built against the old
  shape and holding its scope in a variable passes structural checking with no excess-property
  check, arrives with `requester` undefined, and lands on `!requester → ALLOW_ALL` — the permission
  check silently off. No in-repo consumer is affected; both apps use the built-in runners.

  **The identity round trip through the job row is now held, and proved by mutation.** `requesterOf`
  is exported and covered by `requesterRoundTrip.test.ts`; the write side is covered through the real
  `enqueue` in `PayloadJobsTaskRunner.test.ts` rather than a copy of its logic. Both mutations that
  were green before now redden exactly one file each:

      requesterOf -> return null                     before: 1591 green   after: 1 file red
      requester_id/_collection written as null       before: 1591 green   after: 1 file red

  The earlier fix closed the *decision* (`asRequester`); this closes the *wiring*, which is the half
  the mutation audit could not see because no unit check reached it.

  **AC1 was amended rather than satisfied by moving code.** Two readings were open — move
  `asRequester` to `identityOf.ts`, or widen the criterion. The package's own precedent settles it:
  `makeIdPath` sits in the same file as `IdPath`, described there as "the sole constructor, so it can
  never drift". `asRequester` is the same thing for `Requester` and belongs beside it.

  **Also corrected:** `server/shared/payload/index.ts` was created by this task and removed again in
  the same session once the suite audit measured zero importers; the Placement paragraph no longer
  promises it. Suite now 1599 in 132 files.

- 2026-09-30 — second `/sp-red-test` audit and second `/sp-review-deep`, over the ten files changed
  after the first review. Both are recorded in
  `artifacts/2026-09-25-suite-audit-after-the-unbundle.txt`.

  **The audit's reason for existing:** the three "let the contract carry it" rewrites were shipped on
  a green suite and reported done; two of them turned out to be guarded by nothing. Eight mutations
  now hold all three, including a value-swap probe that answers whether `expect.objectContaining` is
  too loose — it is not, it asserts the values.

  **The deep review came back clean** — 8 findings raised, 7 dropped at the confidence gate, 1
  reported: `configureAutoTranslate`'s doc block had been orphaned above the newly spliced
  `dropLocalesTheProjectDoesNotHave`, leaving the module's only exported entry point undocumented.
  Fixed.

  **Two claims in this work were wrong and are corrected in the artifact.** The comment the
  `SyncTaskRunner` rewrite replaced asserted that without the `finally` stamp `LazyMap` would never
  evict a failed task; eviction in fact gates on `status`. The first replacement story — that
  `updatedAt` breaks a tie between tasks — is also too wide: `latestTaskPerTargetLocale` has one
  caller, for one document, so no tie arises. What is real is narrower and still worth holding:
  `updatedAt` reaches the panel as `updated_at`, so a settled task used to display its start time.
  Three independent passes have now failed to break that third reading.

  **Still owed, and the owner's to write:** `README.md` needs the `Since v0.14.0` note this package's
  CLAUDE.md requires beside the `@since` on a newly exported symbol. The `RequestScope`/`Requester`
  export also has no check of its own existence — measured, removing it leaves 1605 unit checks and
  check-types green.
