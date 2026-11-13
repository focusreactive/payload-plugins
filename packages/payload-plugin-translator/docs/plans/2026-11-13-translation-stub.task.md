# Translation stub module

Build step: 2026-11-13-admin-ui-on-stubs.design.md #3

## Requirements / Task restatement

The 1.0 admin must be buildable before the real read model exists. A server module,
`translationStub({ scenario })`, answers the two new reads (document state, list state) and the
existing action routes from an in-memory world, on the same paths and behind the same access guard
as the real routes. It is scaffolding of the feature branch: never published, removed in the same
branch once the real read modules exist.

- **Reads.** `GET {basePath}/document-state/:collection_slug/:collection_id` answers
  `DocumentTranslationState`; `GET {basePath}/list-state/:collection_slug?ids=…` answers
  `ListTranslationState`. The target locales are the host's own localization locales minus the
  default (source) locale.
- **Actions** answer what the real routes answer: enqueue `200 {data: EnqueueResponse}`, cancel
  `204` (or `200 {refused}`), cancel-by-collection `204`, run `204`, dismiss `200 {success: true}`, field
  `200 {data: FieldTranslationResult}`.
- **Admission rules repeat the real server's:** one live run per document — a second enqueue for a
  document with a queued or running run lists it under `busy` and queues nothing for it; cancel
  takes run handles and removes the whole run; run re-runs a queued or failed run.
- **Progress is a deliberately simple imitation:** every read of a document's state advances each
  of its live runs one step — queued → running → done (the run disappears, its locales become
  tracked with every leaf current) or → failed when the scenario says runs fail (the first locale
  fails, the rest become not-started).
- **Scenarios, chosen at boot:** `mixed` (default; states spread by a stable hash of
  `collection:id`), `empty`, `failing`, `slow`, `abilities-limited`, `provenance-off`.
- **The sandbox** switches between the stub and the real modules with `TRANSLATOR_STUB=1` and
  picks the scenario with `TRANSLATOR_STUB_SCENARIO`.

## Decisions

- **No new access actions.** The document-state read is guarded by `document-status`, the
  list-state read by `collection-status`; every action keeps its existing member. Rejected: new
  members, which the owner declined because hosts would have to answer them.
- **One `StubWorld` per module instance,** created in the factory closure. Rejected: a module-level
  world, which two Payload configs in one process would share.
- **`model/` and `scenarios/` import only the wire types and each other,** enforced by lint zone
  T4. The handlers in `http/` are the only stub files that see Payload.
- **Progress reports first, then advances.** A read answers the state the world was in and then
  moves each live run one step, so every state — queued included — is seen once. Rejected:
  advancing first, which makes a queued run invisible to any read.
- **A new run supersedes a failed run** of the same document that covers any of its locales: the
  failed run is removed when the new one is admitted. A locale whose last run succeeded must carry
  no run, and this keeps that true without per-locale bookkeeping.
- **Failure lands on the run's first locale;** the rest become `not-started` with that
  `failedLocale`.
- **Request validation reuses the real routes' zod schemas,** so a malformed request is refused
  with the same 400. Rejected: hand-written checks, a second description of each body.
- **What the stub does not repeat:** per-document access (every caller with the action is
  authorised, so cancel never answers `refused`), `select_all` (only the listed ids are queued),
  and existence checks (every id answers state). The real server owns those; the admin only needs
  their answer shapes, which are kept.
- **`filled` appears in `mixed` too,** beside the tracked kinds, so one list page shows every
  content kind. `provenance-off` shows only `empty` and `filled`, with no verdicts, and a finished
  run leaves `filled` there.
- **Latency is applied inside the guard,** `withAccessCheck(withErrorHandler(delayed(handler)))`,
  so every route keeps the real routes' wrapper order; a refusal answers at once.
- **`abilities-limited` leaves out cancel, cancel-by-collection and run,** as a runner that cannot
  stop or run does, so derived abilities report `cancel` and `runNow` false.
- **The field translation** reads the saved source value through the existing source-document read
  (source locale, current draft, no fallback) and answers `[de] value` for a string; anything else
  is a `noop` with an `info` notice. A document the caller cannot read answers 404.
- **Reachable from the sandbox through a `./stub` export** of `src/stub.ts`, which re-exports only
  `translationStub`. It is not in `src/index.ts` nor in the modules barrel. No production guard:
  it is never published.
- **The sandbox's stub mode turns provenance off,** since provenance registers the dismiss route
  the stub serves and the plugin now refuses two contributions on one route.

## Acceptance criteria

| AC | Covers | Criterion | How it is checked | Result |
|---|---|---|---|---|
| AC1 | R2 | A second enqueue for a document with a live run answers it under `busy` and queues nothing; cancel removes the whole run with all its locales; run re-runs a failed run | `StubWorld.test.ts` || met — red first: 22/22 world and scenario cases failed on a skeleton that threw; green after `StubWorld` (busy, whole-run cancel, cancel by collection, run now, re-run of a failed run) |
| AC2 | R7 | Reads advance a run queued → running → done, after which its locales are tracked and all current; in `failing` the run ends failed with the rest of its locales not-started | `StubWorld.test.ts` || met — `progress` cases green, including `filled` without records and the failed / not-started split |
| AC3 | R7, R8 | `untracked` is never reported as `empty`, and `mixed` shows every content kind and run status over a page of documents | `StubWorld.test.ts`, `scenarios.test.ts` || met — `never reports untracked content as empty` green; `mixed` over 30 documents shows tracked, dismissed, empty, untracked, filled and none, queued, running, failed, not-started |
| AC4 | R2, R8 | Through the module, the reads answer the wire shapes and the actions answer the real routes' status codes and bodies | `translationStub.test.ts` with a collecting module context || met — 15 cases green: 200 bodies for both reads and enqueue (`busy` with `queued: 0`), 204 for cancel, cancel by collection and run, 200 `{success: true}` for dismiss, 404 for an unknown run, 400 for a malformed or unmanaged request, `[de] Hello` from a source read with `draft: true, fallbackLocale: false` |
| AC5 | R2 | Every stub route answers 403 to a refusing guard and lets a guard's navigation signal through | `everyStubRouteIsGuarded.test.ts` || met — all 8 stub routes answer 403; removing the guard from one route turned 2 cases red |
| AC6 | R2 | Listing the stub beside `documentTranslation()`, or with provenance on, is refused with `DuplicateEndpointError` | `everyStubRouteIsGuarded.test.ts` || met — both refusals green |
| AC7 | R7 | `abilities-limited` makes the admin config report `cancel` and `runNow` false | `everyStubRouteIsGuarded.test.ts` || met — abilities `cancel: false, runNow: false`; the other three stay true |
| AC8 | R8 | `model/` and `scenarios/` importing anything but the wire types or each other is refused by lint | probe file with a `payload` import || met — a probe importing `payload` and `types/AccessGuard.js` gave 2 `no-restricted-imports` errors, while its wire, sibling and `../scenarios` imports passed (oxlint run from the repo root) |
| AC9 | R2, R7 | Nothing existing breaks; the declaration build emits the `./stub` entry | check-types, vitest, oxlint, `bun run build` || met — check-types 0 errors (package and `apps/dev`); 229 test files / 2707 tests passed; oxlint 0 errors; oxfmt only the three known scss files; `bun run build` green and emits `dist/stub.js` and `dist/stub.d.ts` |

## Risk notes

- The stub repeats the admission rules by hand; if the real server changes them, the stub drifts
  until its removal. Its lifetime is the feature branch.
- One Payload config evaluated twice in one process would make two worlds, so actions would be
  invisible to reads. The sandbox signal (enqueue, then read shows the run) catches it.
- Every read moves runs forward, so the list page and the document panel reading together finish a
  run in fewer visible steps. Accepted: the imitation is meant to be simple.
- Dismiss answers `200 {data: {success: true}}` in the stub, as the real route does; the wire comment
  says the same.
- The translator's lint zones match paths relative to the repo root, so oxlint must be run from
  there for T1–T4 to apply.
- Not yet observed in the running sandbox: the enqueue-then-read signal is covered by the module
  tests only.
