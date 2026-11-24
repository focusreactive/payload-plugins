# The stub stops being a published surface

Requirements: `docs/plans/2026-11-13-admin-ui-on-stubs.design.md`
Build step: 2026-11-13-admin-ui-on-stubs.design.md #13

Builds step 13 of that design — the part of it that the release needs. Decision D8 is the
settled input, with the reduction recorded below.

## Requirements / Task restatement

The package's `exports` map carries `"./stub"`, which serves an in-memory world of invented
documents. It exists so the admin could be built before the real read modules answered, and
its own docblock calls it branch scaffolding that is never published. It is published: the
entry resolves to `dist/stub.js` for every consumer of the package.

The design already owns its removal. Step 13's trigger is that the real read modules are
proved against a real server first; finding 5 of the same design moved that proof into the
`apps/dev` integration tests rather than a fourth binding of the client contract suite.
Those tests exist — `document-state.int.test.ts`, `list-state.int.test.ts`,
`list-state-after-a-failure.int.test.ts`, `a-field-the-caller-cannot-read.int.test.ts` — so
the trigger has fired.

- R4 (in, part) The scaffolding entry leaves the published surface before the release that
  would carry it.
- (out) Deleting the stub module itself, moving `StubWorld` and the scenarios into the client
  test tree, and retiring the contract suite's HTTP binding. Step 13 also names these; they
  are reduced out below because they cost coverage of shipped code and buy nothing a consumer
  can see.

## What this starts from (measured)

- `package.json:42-45` maps `"./stub"` to `dist/stub.js` and `dist/stub.d.ts`.
- `src/stub.ts` is one line, re-exporting `translationStub` from
  `src/composition/modules/translationStub.ts`.
- One consumer: `apps/dev/src/lib/translator/devToggles.ts:15` imports the published subpath
  and serves the stub behind `TRANSLATOR_STUB=1`, documented at `apps/dev/.env.example:16-20`.
  Nothing else in the repository imports it, and `src/index.ts` does not mention it.
- The module is 1289 lines over `model/` (308), `scenarios/` (146), `http/` (235) and its own
  tests (521). Six files take `StubWorld`, `SCENARIOS` or the factory: the in-memory
  repository fixture, three widget tests, `inProcessFetch.fixture.ts` behind the contract
  suite's `"http over the stub's handlers"` binding, and `everyStubRouteIsGuarded.test.ts`.
- `everyRegisteredRouteIsGuarded.test.ts` is the real-route twin of that last one, so
  production routes keep their guard proof whatever happens to the stub's.
- The branch stands at step 12: `model/types.ts` and `useDocumentStaleness` are gone, and
  `queries/useDocumentTranslationState.ts` and `queries/useListTranslationState.ts` are in
  place.

## Decisions

### D1. The scaffolding leaves the shipped tree, and the harness survives as a fixture

- **Chosen:** step 13 in full, with one change to how it is carried out. The world, the scenarios
  **and the HTTP routes** move into `client/entities/translation/__tests__/stub-world/`. The
  published entry, the module factory, the sandbox mode and the two tests that exist only to
  exercise the factory are deleted.
- **Why it bites:** the build excludes `src/**/__tests__/**`, so a file that moves there leaves the
  published package altogether — `dist/server/modules/translation-stub/` ships today and does not
  after. Keeping the module where it was would close the entry but still ship 1289 lines of
  invented documents inside the tarball.
- **Why the routes move rather than die:** the design's step 13 deletes them, written when the
  client contract suite was expected to gain a binding over the real handlers. Finding 5 of the same
  design moved that proof into the `apps/dev` integration tests, which exercise the server and not
  `HttpTranslationRepository`. Deleting the routes would therefore take nine of that class's ten
  cases with them — six from the contract binding and three of its four own cases — leaving shipped
  client code with one. Moving them costs twelve lines in the fixture, which now calls
  `createStubRoutes` directly instead of reaching through the deleted factory.
- **Rejected — delete the routes as the design's step 13 says:** it removes 235 further lines of
  scaffolding from a tree where the rest of the move already removes them from the package, and
  pays for it with the only end-to-end exercise of a shipped class.
- **Rejected — close the entry and leave the module in place:** three edits instead of a move, and
  the compiled scaffolding still ships.
- **Constraint cited:** the owner's selection rule — the shape that costs less coverage wins when
  the consumer-visible result is identical — and the rule that deleting needs the same proof as
  adding.

### D2. The sandbox loses stub mode rather than gaining a second way in

- **Chosen:** delete the `TRANSLATOR_STUB` branch, its import and the `.env.example` lines.
- **Why:** the subpath is the only way `apps/dev` can reach the factory, because it consumes the
  built package and an `exports` map refuses deep imports. Keeping the mode means keeping the entry
  published.
- **Rejected — a second, differently named published entry:** the same surface under another name.
- **Rejected — moving the factory into `apps/dev`:** it would need the world, the scenarios and the
  route builder exported from the package, which is wider than the surface being closed.
- **What is lost:** the scenarios `empty`, `failing`, `slow`, `abilities-limited`, `provenance-off`
  and `mixed` stop being reachable from the running sandbox. They stay reachable from the suites.

### D3. The Payload-free guard is dropped rather than carried to the new paths

- **Chosen:** delete the zone that kept the world and the scenarios free of Payload. Nothing
  replaces it.
- **Why:** the files now live under a client `__tests__` folder, and the client zones end with an
  override that turns import restrictions off for everything there. Carrying the zone across meant
  also reordering it past that override, which is an entry added to a configuration file the owner
  has asked to stop growing — and the added entry repeated a shape the file is already reported
  against, taking its type errors from four to five.
- **Rejected — repoint the zone and move it after the client zones:** built first, then removed. It
  worked, proved by a planted import, but it bought a rule that fights the project's own convention
  for test folders at the cost of another entry in that file.
- **Consequence stated plainly:** nothing now refuses a Payload import into the stub world. If one
  is added, the client component tests that run the fake are where it would surface, and no rule
  will say so first.
- **Constraint cited:** the owner's instruction, 2026-11-24, that the lint configuration takes no
  further additions.

**New surface:** none — this task moves and removes.
**Written contract owed:** none.
**Escalate:** no — a build step of an adopted design.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R4 | The package no longer publishes a `./stub` entry | `grep '"\./stub"' package.json` finds nothing | **fails now** — one match |
| AC2 | R4 | `src/stub.ts` and the module factory are gone | neither file exists | **fails now** — both present |
| AC3 | R4 | Nothing imports the published subpath | `grep -rn "plugin-translator/stub"` over the repository finds nothing | **fails now** — one match |
| AC4 | R4 | The sandbox names no stub mode, in code or in its documented variables | `grep -rn "TRANSLATOR_STUB"` over `apps/` finds nothing | **fails now** — five matches across two files |
| AC5 | R4 | The package ships none of the scaffolding | after a build, neither `dist/stub.js` nor `dist/server/modules/translation-stub/` exists | **fails now** — both are produced |
| AC6 | — | Production routes keep their guard proof once the stub's variant of that test is gone | `everyRegisteredRouteIsGuarded.test.ts` is green and untouched | **passes now** — stays-true |
| AC7 | — | Only the two factory-bound test files stop running | the package test-file count drops by exactly two against `HEAD`, and the moved world and scenario tests report their cases from the new path | **fails now** — they run from the old path |
| AC8 | — | `HttpTranslationRepository` keeps the coverage the move was shaped to protect | its file reports ten cases, the contract binding among them | **passes now** — stays-true, and the reason D1 departs from the design's wording |
| AC9 | — | The lint configuration gains nothing and keeps the shape it had | its diff against `HEAD` is deletions only, and its type errors stay at four | **fails now** — the zone still names the deleted paths |
| AC10 | — | The baselines hold | `bunx oxlint .` no more than 26 warnings and 0 errors · `bunx turbo run check-types` 10/10 · the build exits 0 · the sandbox integration suite unchanged, because it runs against the rebuilt package | **passes now** — measured |

AC4 is the criterion most likely to be met halfway: the toggle lives in code and in `.env.example`,
and a reader who finds the variable documented will conclude the mode still exists.

## Risk

**Low.** Nothing but deletions, no stored shape, no plugin behaviour. Rollback is a revert.
The exposure is the sandbox: a developer who relied on `TRANSLATOR_STUB=1` to see the admin's
empty, failing and slow states loses that, and the replacement is to seed the sandbox or write
the case as an integration test. The published surface closing is the intended breaking
change and is announced by a `BREAKING CHANGE:` footer.

## Decisions by the owner

- 2026-11-13 — the stub is temporary scaffolding with a named trigger: it is removed once the
  real read modules are proved against a real server, and the branch does not merge before it.
- 2026-11-24 — the lint configuration takes no further entries; the guard that would have moved
  with the files is dropped instead, and the consequence is recorded in D3.
