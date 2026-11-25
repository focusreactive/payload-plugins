# The per-leaf verdict

Build step: 2026-11-18-the-server-reads-the-state.design.md #3

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

`changedLeaves` answers each leaf of a receipt with a yes or a no. The admin needs four answers —
current, drifted, unanswered, unrecorded — and they must be the **same** computation the run's
filter uses, so that what the screen marks as owed is exactly what a run would translate.

## Requirements

Requirement ids are the definition's, adopted as the design's build sequence assigns them to this
step; the local ones are lettered so they cannot be read as the definition's.

- R5 (in) The per-leaf drift answer distinguishes all four verdicts, computed once and shared with
  the filter a run applies, rather than in two places.
- Ra (in) The verdict vocabulary is decided in core, and the published wire union cannot drift from
  it without the type-check failing.
- Rb (out) What a run translates. `driftedAddresses` answers exactly what it answered before.
- Rc (out) Every reader of the new function. The document-state model is the next build step.

## Decisions

**D1 — the wire union is a second spelling, pinned, not an alias of core's.** The design has the
union declared in core and the wire file aliasing it. The wire files may not import anything outside
`src/types/wire` — a lint zone with its own reason: a contract both halves read must not drag either
half's code into the other. Rather than carve an exception into that boundary, the four words stay
declared in both places and `__tests__/theVerdictVocabularyIsOne.pins.ts` assigns each union to the
other, so a word added on one side and not the other fails `check-types`. The design's property —
one vocabulary, no silent drift — is kept; only its mechanism changed. Rejected: relaxing the lint
zone for one type-only import, which trades a boundary that holds for all time against saving four
words.

**D2 — `isOwed` is exported beside the verdict.** "Everything that is not current is owed" is the
invariant that makes one computation serve both the run and the screen; written out at each caller
it becomes three copies of a rule nobody declared. Rejected: a `LeafVerdict[]` constant of the owed
words, which would have to be kept in step with the union by hand.

**D3 — the derivations keep their names and their shapes.** `changedLeaves` still answers booleans
and `driftedAddresses` still answers an array, because step 3 is not allowed to move what the run
translates. They are now two lines each over `leafVerdicts`.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R5 | Each of the four verdicts is produced by the case that should produce it | `bunx vitest run src/core/domain/provenance/__tests__/leafVerdicts.test.ts` | one passing case per verdict |
| AC2 | R5 | The answer covers exactly the leaves the source has now | same file | the case over a mixed receipt matches the whole map; a leaf the receipt has and the source lost is absent |
| AC3 | R5, Rb | The existing staleness tests are untouched and still pass | `git diff HEAD --stat -- src/core/domain/provenance/__tests__/staleness.test.ts` + `bunx vitest run src/core/domain/provenance` | no diff; 0 failing |
| AC4 | R5, Rb | The run's owed set is exactly the non-current verdicts | same new file | both sets are equal over a receipt holding all four cases |
| AC5 | Ra | A word on one side and not the other fails the type-check | add `\| "invented"` to the engine's union, run `bun run check-types`, revert | the mutated run reports an error; the reverted run reports none |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree (HEAD = 7cd4ca8b), 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — `leafVerdicts.ts` does not exist in HEAD | change |
| AC2 | **FAIL** — as above | change |
| AC3 | **PASS** — the file is unchanged and its suite is green | invariant |
| AC4 | **FAIL** — there is no verdict map to compare the run's set against | change |
| AC5 | **FAIL** — the pins file does not exist; the two vocabularies are unconnected | change |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 249 files, 2833 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | the four cases pass |
| AC2 | met | the whole-map case and the dropped-leaf case pass |
| AC3 | met | `git diff` over the file is empty; 65 tests pass in the folder |
| AC4 | met | the equality case passes, and the empty case with it |
| AC5 | met | the mutated run reported 1 error, the reverted run 0 |
| AC6 | met | 0 errors |
| AC7 | met | 250 files passed, 2846 passed, 15 skipped — thirteen more, the new file's cases |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Low.** One new pure function and two rewrites of three lines each, guarded by tests that were not
allowed to change. The only published surface touched is a docblock on the wire union.
