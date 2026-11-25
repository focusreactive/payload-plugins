# The document route

Build step: 2026-11-18-the-server-reads-the-state.design.md #8

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

`GET {basePath}/document-state/:collection_slug/:collection_id` answers for real: the shape built
in step 4, the content rule from step 5, the run state from step 6 and the records reached in
step 7, behind the same guard the panel already uses.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R1 (in) The document read answers the whole `DocumentTranslationState` for one document.
- R9 (in) The read respects the host's read rules, per document.
- R10 (in) A document that is absent and one the caller may not read answer alike.
- R16 (in) No new member joins the published action union.

## Decisions

**D1 — the refusal strings move, they are not re-exported.** `readRefusals.ts` is now the one
spelling of `NOT_MANAGED`, `NO_LOCALIZATION` and `NOT_FOUND`, and the stub imports them from there.
Leaving them in the stub would have the shipped routes depend on scaffolding that is scheduled for
deletion.

**D2 — the preamble answers the document or the refusal, never a nullable document.** A handler
that got `null` back would each write its own 404, which is how `get-document-status` already
drifted into answering `200 []`. `requireReadableDocument` returns a tagged pair, so the only way
past it is to have passed it.

**D3 — the source locale is the collection's own, else the project's default.** The same rule
`Locales.resolveSource` now holds for the auto-translate hook, read from the registered
collection's own config rather than from the locale being viewed.

**D4 — the route is guarded by `document-status`.** It feeds the panel that action already names,
and the action union is total by type in the guard table, so adding a member would have stopped the
compiler. A second test asserts this route asks about that action, which is the half the compiler
cannot see.

**D5 — the fingerprinter is built at composition time from the schema map and the language table.**
Both are already on the module context; handing the route a built fingerprinter keeps the handler
from knowing how a fingerprint is made.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | The answer carries the source locale, the tree, the excluded labels and one entry per target locale | `bunx vitest run src/server/features/get-document-state` | the three document cases pass |
| AC2 | R1 | Each locale carries its content state and the run it waits on | same suite | the five locale cases pass, one per state plus the run |
| AC3 | R9, R10 | A document the read did not produce answers 404, absent or unreadable alike | same suite | the 404 case passes; the handler reads through `fetchSourceDocument` with the caller's user |
| AC4 | R1 | An unmanaged collection and a host without localization are refused, in the stub's own words | same suite | both refusal cases pass |
| AC5 | R16 | The route is registered, guarded, and names an action that already existed | `bunx vitest run src/server/shared/access` | the path appears in both guard tables; the new case asserts `document-status` |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = receipts in one read), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — only the stub answers this path | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — no real handler exists to refuse | change |
| AC4 | **FAIL** — as above | change |
| AC5 | **FAIL** — the path is absent from both guard tables | change |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 2914 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | the shape, the locale list and the per-collection source cases pass |
| AC2 | met | empty, untracked, tracked, filled and the run case pass |
| AC3 | met | the 404 case passes |
| AC4 | met | both refusals pass, with the stub's own sentences |
| AC5 | met | both guard tables list the path; the action case passes |
| AC6 | met | 0 errors |
| AC7 | met | 2931 passed, 15 skipped — seventeen more |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Medium — this is the first step a person can see.** The route is live wherever the sandbox is not
in stub mode, and it reads the host's collections at request time. Its reads are all through
functions that already enforce access; what is new is the per-request walk of the sanitized config,
which is bounded by the collection's own size. The sandbox proof is build step 10.
