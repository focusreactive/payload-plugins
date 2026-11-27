# The harness drives both routes

Build step: 2026-11-18-the-server-reads-the-state.design.md #10

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

Both reads are built and unit-tested against doubles. This step drives them through a real Payload
boot in the sandbox, which is the only place the access rules, the locale reads and the run records
are the real ones.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R11 (in) The real handlers are exercised against a real boot, not only against doubles.
- Ra (in) The in-process harness can drive a GET route that reads a query string and the admin's
  language.
- Rb (out) Removing the stub. The branch's step 13 owns that.

## Decisions

**D1 — a row the run never got to needs its own read.** The list asks the run store for the live
rows and the recent ones; an abandoned row is neither live nor failed, so the page saw no run at
all for the locale the run never reached, and the failed locale's `locales` list — what cancel and
retry act on — was short by one. `findRecentlyUndeliveredInCollection` reads both outcomes.
`findRecentlyFailedInCollection` is left exactly as it is, because the collection-status route's
answer is not this step's to change. The defect was found by the sandbox test, not by a double.

**D2 — the failure scenario boots on its own.** Two boots in one file left the second without a
database; every other integration file boots once, and this one follows.

**D3 — the invisible-document case is read as a named user.** An unattributed read is deliberately
unchecked, so a rule that hides a row from everyone would have proved nothing. The rule hides it
from the named reader instead.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R11 | A document only its source holds reads every target locale as empty, names the source, and offers the leaves the source holds with their labels and required flags | `cd apps/dev && bun run test:integration:sqlite src/integration/translator/document-state.int.test.ts` | the shape, label and empty cases pass |
| AC2 | R11 | A locale written by hand reads `untracked`, a translated one `tracked` with a verdict per leaf | same file | the case passes after a hand edit and a real run |
| AC3 | R11 | A field the caller may not read appears in neither the tree nor the verdicts, and an excluded field appears only in `excluded` | same file | both cases pass under a field-level `read` rule |
| AC4 | R11 | A document that is not there answers 404 | same file | the case passes |
| AC5 | R11 | A list page answers the ids asked for in order, leaves out one the caller may not read, and says empty or filled with the time of the last run | `cd apps/dev && bun run test:integration:sqlite src/integration/translator/list-state.int.test.ts` | the four cases pass |
| AC6 | R11 | A run that broke shows the failed locale, every locale it covered, and the sibling it never reached as `not-started` naming the one that failed | `… list-state-after-a-failure.int.test.ts` | both cases pass |
| AC7 | Ra | The harness drives a GET with a query string and a language | the two files above | they read `?ids=` and a per-language label through it |
| AC8 | — | The sandbox suite stays green | `cd apps/dev && bun run test:integration:sqlite` | 0 failing |
| AC9 | — | No new type errors anywhere, and no new lint findings | `bunx turbo run check-types` from the root; `bunx oxlint .` in the package | 10/10 and at most 26 warnings |

## Pre-flight — each check run against the untouched tree (HEAD = the list route), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — the file does not exist | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — as above | change |
| AC4 | **FAIL** — as above | change |
| AC5 | **FAIL** — the file does not exist | change |
| AC6 | **FAIL** — as above, and the store has no read that returns an abandoned row | change |
| AC7 | **FAIL** — `callEndpoint` builds a request with no `searchParams` and no `i18n` | change |
| AC8 | **PASS** — 68 files, 272 passed, 7 skipped | invariant |
| AC9 | **PASS** — 10/10, 26 warnings | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | 7 cases pass in the document file |
| AC2 | met | the hand-edited and the translated locale read as expected |
| AC3 | met | `secret` is in neither the tree nor the verdicts; `Slug` is only in `excluded` |
| AC4 | met | 404 |
| AC5 | met | 4 cases pass in the list file |
| AC6 | met | 2 cases pass, after D1's new read |
| AC7 | met | both files drive GETs through the harness |
| AC8 | met | 68 files, 272 passed, 7 skipped |
| AC9 | met | 10/10 type-check tasks; 26 warnings, 0 errors |

## Risk

**Low, and it lowered the risk of the two steps before it.** The step's own change to shipped code
is one new store read, used by one route. What it mainly did was prove the previous two steps
against a real boot — and find the abandoned-row gap that no double could have shown.
