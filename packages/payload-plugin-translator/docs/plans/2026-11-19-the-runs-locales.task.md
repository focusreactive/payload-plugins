# The run's locales

Build step: 2026-11-18-the-server-reads-the-state.design.md #6

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

A locale's row shows the run it is waiting on: queued, running, failed with a message, or never
started because a sibling locale failed. The rows exist; nothing assembles them into that answer,
and the function that picks the latest run per locale sits inside another feature where two new
readers cannot reach it.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R8 (in) A locale's `run` names every locale the run covers, and an abandoned locale names the
  sibling that failed.
- Ra (in) `latestPerTargetLocale` lives where every reader can reach it.
- Rb (out) The routes. Nothing calls `runStateOf` yet.

## Decisions

**D1 — the run handle never crosses the wire, the locale list stands in for it.** `locales` is every
row sharing the handle, in the project's locale order, with any locale the project no longer
configures appended in alphabetical order rather than dropped. Dropping it would hide a locale a
cancel is about to act on.

**D2 — an abandoned locale with no failed sibling reports itself as failed.** The wire has four
words and none of them is "abandoned without a cause". Reporting `not-started` with no
`failedLocale` is not expressible, and reporting nothing would hide a locale that did not run. Its
own stored reason becomes the message.

**D3 — the blamed sibling is the earliest to settle, ties broken by locale code.** Two polls must
name the same locale, so the order cannot depend on the row order the store returns.

**D4 — the message goes through the client-safe projection at this boundary.** A stored reason may
carry provider detail; the admin gets the re-authored text, and the generic line where the row kept
no reason. Guarded by a case whose stored text holds an address that must not reach the browser.

**D5 — the moved function takes its tests with it.** `latestPerTargetLocale` moves to
`modules/runs/runStateOf.ts` beside its only remaining readers, and the status feature's test file
moves with it rather than being left behind pointing at a re-export.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R8 | Each run status becomes the word the wire has for it, and a delivered locale carries no run | `bunx vitest run src/server/modules/runs` | the status cases pass, including the cancelled-falls-back case |
| AC2 | R8 | A run covering three locales reports all three on each of them, in the project's order | same suite | the ordering cases pass, including a locale the project no longer configures |
| AC3 | R8 | A locale abandoned after a sibling failed reports `not-started` and names that sibling, the same one on every poll | same suite | the three abandoned cases pass |
| AC4 | R8 | A failed locale carries text safe for the browser | same suite | the named-reason case passes and the stored detail is absent from the message |
| AC5 | Ra — **negative** | The status feature no longer hands out `latestPerTargetLocale` | same suite | the export assertion passes |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = a locale's content), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — nothing turns rows into a `RunState` | change |
| AC2 | **FAIL** — `runAssignments` drops the locales; no reader groups by handle | change |
| AC3 | **FAIL** — an abandoned row names no sibling | change |
| AC4 | **FAIL** — no read boundary projects the stored reason | change |
| AC5 | **FAIL** — the status feature exports it | change |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 2889 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | six cases on the status map pass |
| AC2 | met | both ordering cases pass |
| AC3 | met | the sibling, the earliest-settled and the tie cases pass |
| AC4 | met | the named-reason case passes; the stored address is absent |
| AC5 | met | the export assertion passes |
| AC6 | met | 0 errors |
| AC7 | met | 2904 passed, 15 skipped — fifteen more |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Low.** One new pure function with no caller yet, and one move whose tests moved with it. The
carried risk is the 500-row read cap, which can truncate a handle's siblings on a document with very
many runs and show a short `locales` — known and recorded in the design, not addressed here.
