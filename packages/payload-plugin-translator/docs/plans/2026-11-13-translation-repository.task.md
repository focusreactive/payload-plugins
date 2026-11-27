# Translation repository, red first

Build step: 2026-11-13-admin-ui-on-stubs.design.md #5

## Requirements / Task restatement

R3: the admin reaches the server through one repository — an interface, a suite written against
the interface and run red first, then an implementation. This step lands the interface, the error
every failure rejects with, the suite, its recorded red run, and an in-memory fake that passes it.
No production code calls the repository yet, and the existing hooks are untouched.

- **`ApiRequestError`** (`client/shared/api/errors/ApiRequestError.ts`): a closed `reason` —
  `network | timeout | forbidden | not-found | rejected | server | busy` — with an optional
  `status` and optional `details` (zod issues), so forms can later read field errors from it.
  `busy` is an action the server refused because the document already has a live run.
- **`TranslationRepository`** (`client/entities/translation/model/TranslationRepository.ts`), eight
  methods over the wire types: `getDocumentState`, `getListState`, `enqueue`, `cancel`,
  `cancelByCollection`, `runNow`, `dismissStaleness`, `translateField`.
- **`describeTranslationRepositoryContract(name, create)`**
  (`client/entities/translation/__tests__/TranslationRepository.contract.ts`): scenario-free
  invariants only, so it can later bind to the real server.
- **Bindings:** a throwing fixture (red, recorded) and an in-memory fake over the stub's world
  (green).

## Decisions

- **The suite's setup contract:** `create()` returns a fresh repository and the binding's locales;
  its server holds documents `"1"` and `"2"` of collection `"pages"`, every target locale empty, no
  run, and nothing else; at least two target locales. The suite asserts no run status beyond
  "queued or running" and compares runs by handle and locales, never by status, because progress
  is the server's business (the stub advances runs on read). Rejected: scenario-seeded cases, which
  only the stub could satisfy.
- **The six invariants:** a fresh document reads every target locale empty with no run; an
  enqueue shows a run on exactly the requested locales of that document only; a second enqueue for
  a document with a live run rejects `busy` and leaves the run as it was; cancelling a run clears
  every locale it covered; a list read answers one entry per known id and omits an unknown id; a
  field translation of a missing document rejects `not-found`. Obligations that need seeded state
  (untracked is never reported as empty) stay in the interface's doc and are tested with the
  scenarios, not here.
- **Busy rule:** an enqueue answer that lists any busy document rejects `busy`, even if other
  documents were queued; mutations refresh on settle, so the screen still shows what was queued.
  Rejected: resolving with a partial answer, which makes every caller inspect `busy` itself. The
  rule lives once, in `model/rejectBusyEnqueue.ts`, for the HTTP implementation to call on the
  decoded answer.
- **`cancel` answers `CancelResponse`;** an HTTP 204 will be normalised to `{ refused: [] }`.
  `cancelByCollection`, `runNow` and `dismissStaleness` answer nothing.
- **`runNow` on a run that is already running rejects `busy`** in the fake, and the HTTP
  implementation maps the server's 429 the same way; an unknown handle rejects `not-found`.
- **The red binding is a `*.test.ts` that runs only with `TRANSLATOR_RED_RUN=1`.** It is
  type-checked and listed as skipped in a normal run, so CI stays green while the red run stays
  reproducible with one variable. Rejected: a file outside vitest's `include`, which nobody can
  run without editing the config; and inverting every case, which would need the suite to know it
  is being run red.
- **The fake reuses the stub's `empty` scenario and `StubWorld` directly,** adds only the set of
  documents that exist, and answers `translateField` for an existing document with a `noop`
  notice. Rejected: a second in-memory world for tests, which would drift from the stub's.
- **The throwing fixture throws synchronously** from every method. Every case fails on the first
  call either way, and the fixture stays one line per method.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|----|--------|-----------|-------------------|--------|
| AC1 | R3 | `TranslationRepository` declares the eight methods over the wire types, and `model/` imports no React, Payload value or `ofetch` | `bun run check-types`; repo-root `oxlint` with the client zones | check-types clean; oxlint 0 errors (31 pre-existing warnings, none in new files) |
| AC2 | R3 | `ApiRequestError` carries a closed `reason`, an optional `status` and optional zod `details` | `bun run check-types`; the suite asserts `reason` on rejections | check-types clean; busy and not-found cases assert `reason` |
| AC3 | R3 | The contract suite fails on every case against the throwing fixture, recorded before any implementation existed | `TRANSLATOR_RED_RUN=1 bunx vitest run …ThrowingTranslationRepository.red.test.ts` | 6 failed of 6, recorded in `docs/plans/artifacts/2026-11-13-repository-red-run.txt` |
| AC4 | R3 | The same suite passes against the in-memory fake over `StubWorld` | `bunx vitest run` | `InMemoryTranslationRepository.test.ts` 6 passed; full run 234 files passed, 1 skipped (the red binding); 2749 tests passed |
| AC5 | R3 | The red binding does not fail a normal run | `bunx vitest run` | listed as skipped (6 tests) |
| AC6 | R3 | No shipped file changes and nothing under `__tests__` reaches `dist` | `bun run build` | swc compiled 452 files, `tsc` declarations clean |

## Risk notes

- The fake shares the stub's world, so it proves the adapter, not the world; the HTTP binding in
  step 6 is the next check.
- The busy rule rejects a partly queued multi-document enqueue. The list page's bulk enqueue
  (step 10) must refresh on settle, as the owner's finding 3 already requires, or it hides the
  documents that were queued.
- The suite never checks `refused` (documents or handles the caller may not touch): it needs a
  per-user setup the scenario-free suite cannot state. It is left to the real-server binding.
