# Two fields leave the contract

Build step: 2026-11-18-the-server-reads-the-state.design.md #1

The design's placement and abstractions are adopted, not re-argued. This file records what the step
changed, the forks it met, and how each criterion was checked.

## Task restatement

`mustInclude` and `dismissed` leave `DocumentTranslationState`, and everything that read them goes
with them. The dismissal feature itself — the control, the route, the access action, the rebasing —
is untouched.

## Requirements

- R1 (in) `LocaleState` no longer carries `mustInclude`, and `ContentState.tracked` no longer
  carries `dismissed`.
- R2 (in) Nothing in the client reads either field, and no code path threads an always-empty
  locked set through the field picker.
- R3 (in) The stub stops producing both values, and its dismissal imitates what the real one does.
- R4 (out) The dismissal feature. The control, the route, the action and the rebasing stay exactly
  as they are.

## Decisions

**D1 — the locked set goes, it is not left empty.** `mustInclude` was the only thing that ever
filled it, so `initialSelection`, `toggleNode`, `FieldTree`'s `Picking` and the checkbox's
`disabled`/`title` all lose the parameter rather than thread an empty set. Rejected: keeping the
plumbing for a future lock — there is no named consumer, and an always-empty set reads as a
capability that exists.

**D2 — the stub's dismissal rebases instead of flagging.** `StubWorld.dismiss` set
`dismissed: true`; with the flag gone it now rewrites that locale's verdicts to `current`. That is
what the real dismissal does — it rebases the receipt onto the source as it stands — so the stub
keeps imitating the server rather than becoming a no-op. Rejected: dropping the method, which would
have made the stub's dismiss route answer success while changing nothing a reader could see.

**D3 — the `dismissed` content seed goes.** With the flag removed it produced exactly what
`drifted` produces, and under D2 a dismissed locale is indistinguishable from `current`. A seed
that cannot be told from two others is not a scenario. The scenario set keeps the other five.

**D4 — three tests are deleted, not rewritten.** "keeps a locked leaf selected when its parent is
cleared", "reads a dismissed locale as up to date" and "asks an empty locale for its required
leaves" each guard behaviour this step removes. A locale whose mark was hidden still reads up to
date, but through its verdicts, which the rewritten stub test now covers.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R1 | Neither field is declared on the wire type | `grep -n "mustInclude\|dismissed" src/types/wire/DocumentTranslationState.ts` | no match |
| AC2 | R2 | No source file outside the dismissal feature mentions either field | `grep -rn "mustInclude" src` and a `dismissed` grep excluding the dismissal feature's own names | no match |
| AC3 | R2 | The picker's selection functions take no locked set | `grep -n "locked" src/client/entities/translation/model/fieldSelection.ts src/client/entities/translation/ui/FieldTree/FieldTree.tsx` | no match |
| AC4 | R3 | Hiding the mark in the stub leaves the locale's verdicts reading `current` | `bunx vitest run src/server/modules/translation-stub` | exit 0; the case asserts the rebased verdict |
| AC5 | R4 — **negative** | The dismissal route, its access action and the rebasing are untouched | `git diff --name-only` over the step | no file under `features/staleness/` or `modules/provenance/` appears |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | The package suite stays green | `bunx vitest run` | 0 failing |
| AC8 | — | No new lint findings | `bunx oxlint .` | at most 26 warnings, 0 errors |

## Pre-flight — each check run against the untouched tree, 2026-11-19

| AC | Result | Kind |
|---|---|---|
| AC1 | **FAIL** — both fields declared | change |
| AC2 | **FAIL** — nine mentions of `mustInclude`, and `dismissed` in the stub and the client | change |
| AC3 | **FAIL** — `locked` threads through both files | change |
| AC4 | **FAIL** — the stub set a flag and the test asserted it | change |
| AC5 | **PASS** — nothing touched yet | invariant |
| AC6 | **PASS** — 0 errors | invariant |
| AC7 | **PASS** — 249 files, 2830 passed, 15 skipped | invariant |
| AC8 | **PASS** — 26 warnings, 0 errors | invariant |

## Results

| AC | Result | Evidence |
|---|---|---|
| AC1 | met | no match |
| AC2 | met | no match outside the dismissal feature's own names |
| AC3 | met | no match |
| AC4 | met | the rewritten case asserts `verdicts: { summary: "current" }` after the call |
| AC5 | met | the step touches no file under `features/staleness/` or `modules/provenance/` |
| AC6 | met | 0 errors |
| AC7 | met | 249 files passed, 2827 passed, 15 skipped — three fewer, exactly the three D4 deletes |
| AC8 | met | 26 warnings, 0 errors |

## Risk

**Low.** The change only removes; the one behavioural rewrite is inside the stub, which never ships.
The wire type is published in type position, but every consumer of these two fields is in this
repository and changes in the same commit.
