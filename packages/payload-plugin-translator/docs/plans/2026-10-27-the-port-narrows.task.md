Build step: ./2026-10-26-the-plugin-keeps-its-own-record.design.md #5

# Step 5 — the port narrows

# Requirements / Task restatement

`TaskRunner` has five required members. Steps 2–4 left three of them with no caller: the plugin
answers "which runs exist for this document" and "which document does this handle name" from its own
record, and decides for itself whether a document may take new work.

This step takes them off the port. What is left is `enqueue`, required, plus two capabilities —
`stop` and `run` — that a runner may or may not have. **A route whose capability the runner lacks is
not registered, and the control that calls it is not drawn.** `createSyncRunner` keeps nothing in
memory any more, which settles the third of the three host-facing warts the design opened with.

Covers R5 of the design.

## What already exists — platform · installed · project · verdict

- **Platform.** Nothing new. Payload only ever sees the endpoints the plugin hands it, so "not
  registered" needs no support from it.
- **Installed.** Nothing new is added.
- **Project.** `assertTaskRunnerContract` is already the published place a runner author checks
  itself against, and `everyRegisteredRouteIsGuarded.test.ts` already boots the plugin and counts
  the routes — which is exactly the shape the capability check needs.
- **Verdict.** Nothing new is designed. One concept is named: what a runner can do beyond accepting
  work.

## Decisions

**D1 — capabilities are declared by the provider, not sniffed from the runner.**
Chosen: `TaskRunnerProvider.capabilities: RunnerCapabilities`, two required booleans. Lost: reading
`typeof runner.stop === "function"` off an instance. Routes are registered at config time and a
runner instance needs a `payload` that does not exist yet, so sniffing would mean building a runner
against a stand-in. Declaring is also checkable: the conformance suite asserts that what a provider
declares, its runner implements, so the two cannot drift silently.

**D2 — both booleans are required, with no default.**
Chosen: a provider states both. Lost: `capabilities?` defaulting to "neither". A default would
quietly unregister `/cancel` for every runner written before this major, and the failure would look
like a missing feature rather than a missing line. Required means the upgrade fails to compile,
which is the loud version of the same news.

**D3 — `cancel` becomes `stop`.**
Chosen: the rename travels with the narrowing. Lost: keeping the name. `cancel` is already the name
of the *route* and of the `cancelled` event, and on a runner that translates inline there is nothing
to cancel — only work to stop as far as it can. One word, one meaning.

**D4 — the sync runner keeps nothing.**
`SyncTaskRunner` loses its in-memory map, and `createSyncRunner` loses the `maxSize`/`ttlMs` options
that bounded it. The map existed to answer status queries; the record answers them now. This is the
README `:398` wart — "last 100 tasks, one hour, forgotten on restart" — and it goes because nothing
reads the map, not because it was tuned better.

**D5 — the two cancel routes are *not* unified, although the ledger plans it.**
`cancel-by-collection-route` stays. Its stated reason for going is that the two routes differ only
in a where-clause, but they also carry two different `TranslatorAction`s, and collapsing them would
take away a host's ability to allow one and refuse the other. That is the owner's call, not a
tidy-up, so it stays planned. Recorded as a deviation from the design's list.

**D6 — `jobs-input-collection-field` is deferred to step 6.**
The design lists it here. It is the *stored job input's* shape, which step 6 rewrites into a
pointer and gives an adoption path for old rows; removing the read fallback now would strand a job
queued before 0.3.0 with no way to read it back. Recorded as a deviation.

**New surface.** `RunnerCapabilities`, published, because a host writing a runner must name it. The
shape check fired on "an exported function gains a parameter" and on a field added to a published
type: two shapes were weighed — two booleans on the provider, and a `capabilities()` method on the
runner. The booleans win on the count that matters: the next capability costs one field and one
registration line, against a method whose absence is itself the answer and so cannot be asserted.

**Written contract.** `RunnerCapabilities` owes something its type cannot state: a provider that
declares a capability must return a runner that implements it. The conformance suite asserts it;
AC4 pins that.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R5 | A runner that implements `enqueue` alone satisfies the port | `bun run check-types` plus `bunx vitest run src/server/modules/task-runner/sync-runner/` | 0 errors, the cases run |
| AC2 | R5 | With such a runner, the cancel and run routes are not registered | `bunx vitest run src/server/shared/access/__tests__/everyRegisteredRouteIsGuarded.test.ts` | exit 0, the cases run |
| AC3 | R5 | With a runner that has both capabilities, every route is registered | same file | exit 0, the case runs |
| AC4 | R5 | A provider that declares a capability it does not implement fails the published conformance suite | `bunx vitest run src/server/modules/task-runner/sync-runner/__tests__/SyncTaskRunner.contract.test.ts` | exit 0, the new case runs |
| AC5 | R5 | The collection panel draws no cancel control when the runner cannot stop | `bunx vitest run src/client/features/collection-translation-progress/` | exit 0, the cases run |
| AC6 | R5 | `assignmentsOf`, `findByCollection`, `TaskFilter` and `toTaskFilter` are gone from the package | `grep -rE "assignmentsOf\|findByCollection\|toTaskFilter" src` | no match outside the deprecations ledger |
| AC7 | R5 | `enqueue` answers with assignments, never with nothing | `grep -n "EnqueueAssignment\[\] \| void" src` | no match |
| AC8 | R5 | The sync runner keeps nothing in memory between requests | `grep -rn "LazyMap" src/server/modules/task-runner` | no match |
| AC9 | R5 | On a real database every route still answers with the Payload Jobs runner | `apps/dev`: `bun run test:integration` | 0 failing |
| AC10 | R5 | On a real database the sync runner still translates, and the routes it cannot serve are absent | `apps/dev`: `bunx vitest run -c vitest.integration.config.ts src/integration/translator/runner-capabilities.int.test.ts` | exit 0, the cases run |
| AC11 | — | No new type errors | `bun run check-types` | 0 errors |
| AC12 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC13 | — | No new lint findings | `bunx oxlint .` | ≤ 37 warnings, 0 errors |
| AC14 | — | The published package still builds under the real `tsc` | repo root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC15 | — | Integration suites stay green on all three adapters | `apps/dev`: `bun run test:integration` ×3 | 0 failing |
| AC16 | — | Every removal is in the ledger, with what replaced it | read `docs/DEPRECATIONS.md` | each removed symbol has an entry marked `removed` with today's date |

## Pre-flight

Run against the tree as step 4 left it, on 2026-10-27.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1–AC5, AC10 | — | not run: capabilities do not exist, and every route is registered unconditionally | change |
| AC6 | `grep -rE "assignmentsOf\|findByCollection\|toTaskFilter" src` | **FAIL** — 30 matches across the port, both runners and their specs | change |
| AC7 | `grep -n "EnqueueAssignment\[\] \| void"` | **FAIL** — one match, `TaskRunner.enqueue` | change |
| AC8 | `grep -rn "LazyMap" src/server/modules/task-runner` | **FAIL** — the sync runner's store | change |
| AC11 | `bun run check-types` | **PASS** — 0 errors | invariant |
| AC12 | `bunx vitest run` | **PASS** — 2645 passing | invariant |
| AC13 | `bunx oxlint .` | **PASS** — 37 warnings, 0 errors | invariant |
| AC14 | `bunx turbo run build --filter=…` | **PASS** — measured at the end of step 4 | invariant |
| AC15, AC9 | `bun run test:integration` ×3 | **PASS** — SQLite 242 / 10 skipped, PostgreSQL 248 / 4, MongoDB 240 / 12 | invariant |

## Risk notes

- **This is the step a host feels.** Every runner a host wrote stops compiling, which is the point of
  a major — but the ledger entries are what turn a compile error into an upgrade instruction. AC16
  is there because an undocumented removal is indistinguishable from a bug.
- **A route that is not registered answers 404, not 501.** A client that calls `/cancel` against a
  runner that cannot stop gets Payload's own not-found. The control is not drawn, so the plugin's
  own admin never does; a host's own client might, and the README should say so.
- **The conformance suite's cancel checks become conditional.** A suite that skips most of itself is
  worth less than one that fails, so the skipping has to be visible: the checks are registered only
  when the capability is declared, and the `describe` says which.

## Review log

### Verification

| AC | Command | Result |
|---|---|---|
| AC1 | `bun run check-types` + `bunx vitest run …/sync-runner/` | **PASS** — `SyncTaskRunner` implements `enqueue` and nothing else |
| AC2, AC3 | `bunx vitest run …/everyRegisteredRouteIsGuarded.test.ts` | **PASS** — 5 cases: nine routes with a capable runner, six with an enqueue-only one |
| AC4 | `bunx vitest run …/SyncTaskRunner.contract.test.ts` | **PASS** — the declaration check runs, the `stop` blocks register themselves away |
| AC5 | `bunx vitest run src/client/features/collection-translation-progress/` | **PASS** — 10 cases, 3 new |
| AC6 | `grep -rE "assignmentsOf\|findByCollection\|toTaskFilter" src` | **PASS** — the only matches are two prose references, both naming what went |
| AC7 | `grep -n "EnqueueAssignment[] \| void" src` | **PASS** — no match |
| AC8 | `grep -rn "LazyMap" src/server/modules/task-runner` | **PASS** — no match; `LazyMap` itself had no caller left and was deleted |
| AC9, AC15 | `bun run test:integration` ×3 | **PASS** — SQLite 240 / 10 skipped, PostgreSQL 246 / 4, MongoDB 238 / 12 |
| AC10 | `apps/dev`: `… runner-capabilities.int.test.ts` | **PASS** — 3 cases |
| AC11 | `bun run check-types` | **PASS** — 0 errors |
| AC12 | `bunx vitest run` | **PASS** — 2593 passing, 9 skipped, 0 failing (from 2645) |
| AC13 | `bunx oxlint .` | **PASS** — 35 warnings, 0 errors (from 37) |
| AC14 | `bunx turbo run build --filter=…` | **PASS**; `bunx turbo run check-types` 9/9 |
| AC16 | `docs/DEPRECATIONS.md` | **PASS** — one new entry, `the-runner-only-accepts-work`; `find-by-collection-document-ids-array` and `enqueue-void-return` moved to `removed` with today's date |

**The nine skipped checks are the point.** They are the `stop` blocks of the conformance suite,
registered away by `describe.runIf` for a runner that declares `stop: false`. The suite says so in
its own names rather than passing quietly.

### Mutations

Thirteen mutations, each applied to the implementation alone, the affected specs run, and the file
restored from a copy with the restore verified by comparison.

| | What was broken | Went red |
|---|---|---|
| Q1 | the cancel route is registered whatever the runner can do | leaves out the routes an enqueue-only runner cannot serve |
| Q2 | the run-now route is registered whatever the runner can do | the same check |
| Q3 | the status routes are gated on a capability they do not need | 2 checks |
| Q4 | the sync runner claims it can stop work | 10 checks, the declaration check among them |
| Q5 | the cancel control is drawn whatever the runner can do | is not drawn when the runner cannot |
| Q6b | the capability stops reaching the dashboard at composition | tells the bulk dashboard whether the runner can stop |
| Q6c | the export drops the capability from its server props | the same check |
| Q7b | the cancel handler calls a runner that cannot stop | is answered rather than called |
| Q7c | the run handler calls a runner that cannot run on demand | is answered rather than called |
| Q8 | the sync runner serves a locale twice when the request lists it twice | serves a locale once |

**Two mutations did not bite, and the two outcomes are different.**

1. **Q6 and Q7 were real gaps.** Nothing checked that the capability survives the trip from the
   provider to the dashboard's server props, and nothing checked that a handler meets a runner
   without the capability with an answer rather than a crash. Three checks added — two on the
   handlers, one over the composition — and Q6b, Q6c, Q7b and Q7c then reddened them.
2. **Q9 was withdrawn as an invalid mutation.** It replaced the declaration check's left-hand side
   with its right-hand side, making the assertion compare `capabilities` with itself. Nothing
   reddened because a check cannot check itself; the mutation changed the test, not the
   implementation. Q4 is the valid mutation for that check, and it reddened ten cases.

**The one hand-off still unchecked** is the JSX line in `BulkTranslationDashboard.tsx` that passes
`canStop` to the panel. Both ends of the chain are pinned — composition to server props, and the
panel's own behaviour — but rendering the dashboard itself would need most of Payload's admin
context for one prop. Recorded rather than faked.

### The review passes

**Complexity.** Scenario: *a host writes a runner of their own*, which is the scenario this whole
step is for. Before: five required members, three of which needed the runner to keep a searchable
store of its own. After: one required member, two optional capabilities, and a declaration of which.
READ for that host falls from the whole `TaskFilter`/`Task` vocabulary to `EnqueueAssignment`. The
second scenario, *a new capability appears*, costs five edits — the type, the registration line, the
route, and the two built-in declarations — against a port change that would previously have broken
every runner in existence.

**Abstraction.** One finding, applied: `LazyMap` had no caller once the sync runner stopped keeping
anything, so the class, its spec and its barrel line went. `RunnerCapabilities` itself was weighed
against a `capabilities()` method on the runner: the booleans win because an absent method is its
own answer and so cannot be asserted, while a declaration that disagrees with the implementation is
exactly what the conformance suite now catches.

**Comments.** Every block in the diff was judged. Two were repaired rather than written: a comment
in the Payload Jobs runner's spec pointed at `findByCollection` for a drizzle quirk that is not
`findByCollection`'s, and the `TaskRunner` interface docblock gained a `@since` line naming what
left. The two `notImplemented` guards carry the only genuinely non-obvious why in the step — they
are unreachable through the plugin's own wiring, and say so.

### Deviations from the contract

1. **The two cancel routes are not unified (D5).** The design lists `cancel-by-collection-route`
   among this step's removals. It stays `planned`: the two routes carry two different
   `TranslatorAction`s, and collapsing them takes away a host's ability to allow one and refuse the
   other. That is the owner's call.
2. **`jobs-input-collection-field` is deferred to step 6 (D6).** It is the stored job input's shape,
   which step 6 rewrites into a pointer and gives an adoption path for; removing the read fallback
   now would strand a job queued before 0.3.0.
3. **`SyncRunnerOptions` went with the map.** Not on the design's list, but `maxSize` and `ttlMs`
   only ever bounded the in-memory store, and `createSyncRunner` now takes no options at all. It is
   in the ledger entry.

### Findings carried forward

- **A route that is not registered answers 404, not 501.** The plugin's own admin draws no control
  for it, but a host's own client gets Payload's not-found. The handlers answer 501 if mounted by
  hand. The README should say which, and that is the owner's text to write.
- **Three README warts are now settled in code and unsettled in prose.** `:401` (status dies with
  the job row) was closed in step 2, `:398` (the sync runner forgets on restart) closes here, and
  `:403` (pruning) gained its new rule in step 2 — a row with no `settledAt` must never be pruned.
  All three need the README changed, which is the owner's to cut.
- **`TranslatorAction` still lists `cancel-by-collection`.** It is correct while that route exists;
  it goes with the unification whenever that is decided.
