# The list route

Build step: 2026-11-18-the-server-reads-the-state.design.md #9

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

`GET {basePath}/list-state/:collection_slug?ids=a,b,c` answers one page of a list view: for each
document the caller may read, whether each locale holds anything and what run it waits on. The cost
of a page must not grow with the number of rows.

## Requirements

Requirement ids are the definition's, as the design's build sequence assigns them to this step.

- R2 (in) A list read answers about the ids it was asked for, reading only those.
- Ra (in) An id the caller may not read is absent from the answer rather than refused or reported
  as empty.
- Rb (out) Drift per row. A row says whether the locale holds anything, never how far behind.

## Decisions

**D1 — the page is refused past the cap, never cut short.** `?ids=` is parsed by a schema that
splits, trims, drops empties and removes duplicates keeping the caller's order, and refuses more
than a hundred with a 400. A silent truncation would answer a page while leaving rows looking
untranslated.

**D2 — the content question is asked per locale for the whole page.** `localesHoldingContent` now
takes the ids, so a page costs one query per locale rather than one per row. The document route
asks the same function about one id.

**D3 — two run reads, not one.** A failure is settled, so the live read filters it out and a row
that tried and broke would be indistinguishable from one nobody translated. The recently-failed
read uses the window the collection-status route already uses, and both are filtered to the page's
own ids.

**D4 — the locales rule is shared, not copied.** `readLocales` moves to `_lib`, so the two state
reads resolve the source locale and the target list the same way; a feature cannot import another
feature, and copying it is how the two would drift.

**D5 — a filled row names the last run's time where records are kept, and `null` where they are
not.** The wire has one field for it and the list shows no drift, so there is nothing else a record
is needed for here.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R2 | The answer carries exactly the ids asked for, in the order asked, each named once | `bunx vitest run src/server/features/get-list-state` | the order, the duplicate and the empty-page cases pass |
| AC2 | Ra | An id the caller may not read is absent, and the rest of the page still answers | same suite | the invisible-id case passes |
| AC3 | R2 | More ids than a page may ask about is a 400 | same suite | the cap case passes |
| AC4 | R2 | A locale that holds nothing reads empty; one that holds content reads filled, with the time of the last run, or none where records are not kept | same suite | the three content cases pass |
| AC5 | R2 | A live run and a failure that settled inside the window both reach the row | same suite | both run cases pass |
| AC6 | R2 | The route is registered and guarded by the action its list already names | `bunx vitest run src/server/shared/access` | the path is in both guard tables; the action case passes |
| AC7 | — | No new type errors | `bun run check-types` | 0 errors |
| AC8 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC9 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = the document route), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — only the stub answers this path | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **FAIL** — the stub reads `ids` with a split and no cap | change |
| AC4 | **FAIL** — nothing reads a target locale for a page | change |
| AC5 | **FAIL** — no reader joins the live and the recently-failed rows for named documents | change |
| AC6 | **FAIL** — the path is absent from both guard tables | change |
| AC7 | **PASS** — 0 errors | invariant |
| AC8 | **PASS** — 2931 passed, 15 skipped | invariant |
| AC9 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | the order, duplicate and empty cases pass |
| AC2 | met | the invisible-id case passes |
| AC3 | met | a hundred and one ids answer 400 |
| AC4 | met | empty, filled-with-a-time and filled-without-records pass |
| AC5 | met | the live and the recently-failed cases pass |
| AC6 | met | both guard tables list the path; the action case passes |
| AC7 | met | 0 errors |
| AC8 | met | 2948 passed, 15 skipped — seventeen more |
| AC9 | met | 26 warnings, 0 errors |

## Risk

**Medium, and bounded by the cap.** At a hundred ids and six locales the request issues six
existence queries over a hundred ids each, one records read and two run reads — the cap is the only
thing bounding it, which is why D1 refuses rather than truncates. The sandbox proof is build
step 10.
