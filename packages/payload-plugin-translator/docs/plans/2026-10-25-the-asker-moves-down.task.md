Build step: 2026-10-25-asking-payload-everywhere.design.md #1

## Task restatement

Two pure moves, so that the five entry points that must start asking Payload's rules can reach the
function that asks, without any of them importing across a feature boundary.

**Move 1.** `mayWrite`, `rebuildRequester` and `RebuiltRequester` leave
`features/translate-document/translationPermission.ts` for a new `server/shared/access/permission.ts`.

**Move 2.** `visibleIds` and `getAllCollectionIds` leave `features/_lib/collection-utils.ts` for a new
`server/shared/payload/collections.ts`. `isCollectionAvailable` stays where it is.

Covers **R7** of the design: the existing ask keeps working, unchanged, on every path. Nothing from
steps 3–10 is in scope — no new question is asked anywhere, and no handler gains a check.

## What already exists — platform · installed · project · verdict

Nothing new is built. Both targets are existing functions moving between existing directories. The
only judgement is where the pieces they drag with them should land.

## Decisions

### D1 — the two error classes move too, because they have to

`mayWrite` throws `PermissionCheckFailed` (`translationPermission.ts:69`) and `rebuildRequester`
throws `RequesterMissing` (`:138`). Both classes live in `features/translate-document/`.

**Chosen:** `PermissionCheckFailed.ts` and `RequesterMissing.ts` move to `server/shared/access/`
alongside the functions that throw them.

**Rejected — leave them and import upward.** `shared/access/permission.ts` would then import from
`features/translate-document/`, which is the exact upward edge this move exists to remove. The move
would create the problem it was meant to solve.

**Constraint cited:** nothing else throws or catches either class —
`grep` finds them only in `translationPermission.ts`, its own test, and
`shared/payload/__tests__/swallowOrThrow.test.ts`.

**Side effect, and it is the good kind:** that last file currently reaches
`../../../features/translate-document/PermissionCheckFailed.js` — a test in `shared/` importing from
`features/`. After the move it imports a sibling. The design named this as an opportunity; it turns
out not to be optional.

### D2 — the three mocked test files re-point, they do not gain a shim

`handler.access`, `handler.enforce` and `handler.spend` each call `vi.mock("../translationPermission.js")`
and assert on the arguments `mayWrite` and `checkTranslationPermission` receive. A module's exports are
replaced for its *importers*; once `targetDocument.ts` imports `mayWrite` from `shared/access/`, mocking
the old path stops intercepting it. This was measured on this branch two tasks ago.

**Chosen:** the three files re-point their mock to the new path. Assertions are untouched.

**Rejected — keep a re-export in `translationPermission.ts` so the old mock path still works.** That is
a shim whose only consumer is a test, and it would leave the feature as the import path for a function
that no longer lives there — so a later reader would not learn from the code where the asker is.

**Constraint cited:** the criterion this task is graded on is *assertion* lines unchanged, not test
files untouched. A mock target is setup.

### D3 — whether `checkTranslationPermission` moves as well

**This is the gate question.** The design's D4 names three things to move and is silent about the
fourth. After D1, what is left in `translationPermission.ts` is one eight-line wrapper that imports
everything it uses from `shared/access/`.

Both options are buildable and both are honest; see the gate message.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R7 | The asker lives in the shared layer | `server/shared/access/permission.ts` exists and declares `mayWrite`, `rebuildRequester`, `RebuiltRequester`; `features/translate-document/translationPermission.ts` declares none of them | file present, 3 declarations there, `0` in the feature |
| AC2 | R7 | No file under `server/shared/` imports from `server/features/` | `grep -rln 'features/' src/server/shared/` | only `accessIsNotOptional.pins.ts` remains (it pins the plugin's own config surface); `swallowOrThrow.test.ts` is gone from the list |
| AC3 | R7 | The visibility helpers live in the shared layer | `server/shared/payload/collections.ts` declares `visibleIds` and `getAllCollectionIds`; `features/_lib/collection-utils.ts` declares only `isCollectionAvailable` | 2 and 1 |
| AC4 | R7 | Behaviour is unchanged | `bunx vitest run`, then count changed assertion lines across every pre-existing test file | **2490 or more** passing with the delta explained; **0** changed assertion lines |
| AC5 | — | The real declaration build passes | `bunx turbo run build --filter='./packages/payload-plugin-translator'` from the root | exit 0 |
| AC6 | — | No new type errors, no new analyzer findings | `bun run check-types` in the package and in `apps/dev`; `sp-lint-delta.sh -- bunx oxlint .` | `0` each; nothing introduced |
| AC7 | R7 | Access control still holds end to end | rebuild, then from `apps/dev`: `bun run test:integration` | **225 passed / 8 skipped** |
| AC8 | — | Nothing but a move happened | `git diff` of the moved function bodies against their previous text | identical apart from import lines |

## Pre-flight

| AC | Result now | Kind |
|---|---|---|
| AC1 | `shared/access/permission.ts` absent; both functions declared in the feature | must change — fails now ✓ |
| AC2 | **two** files under `shared/` import `features/` | must change — fails now ✓ |
| AC3 | `shared/payload/collections.ts` absent; both helpers in `_lib` | must change — fails now ✓ |
| AC4 | 190 files / **2490** passing | invariant — passes now ✓ |
| AC6 | `check-types` 0; oxlint 43 warnings, 0 errors | invariant — passes now ✓ |
| AC5, AC7 | build green and 225/8 at the last run on this tree | invariant — re-run in Phase 5 |

**On AC4's number.** A pure move should leave the count alone, but the package has a check that runs
once per source file under `src/server` and `src/core`. Two or four new files therefore add two or
four checks. Any other movement is a finding to report, not a number to adjust.

## Risk notes

- **Low risk**, and it binds: no behaviour changes, no new question is asked, the public surface is
  untouched, and the existing suites cover every moved function. Phase 5 runs one reviewer, not three.
- **The mock trap is the whole risk.** Three test files mock by module path. If a mock is re-pointed
  wrongly, the test still passes — it simply stops intercepting, and the assertion then checks a call
  that the real code made for a different reason. Each re-pointed mock needs its interception proved,
  not assumed: break the real function and confirm the test goes red.
- **`enqueue-translation/__tests__/handler.test.ts` mocks `../../_lib/collection-utils.js`** and
  supplies `getAllCollectionIds`. Move 2 moves that function out, so the same trap applies there.
- Not in scope: any new ask, the action union, the brand at the queue sink, the module seam — steps
  3–10.

## Human choices

**2026-10-25, at the gate.** *"Перевезти тоже, файл удалить"* — D3 resolves to moving
`checkTranslationPermission` as well, so `features/translate-document/translationPermission.ts` is
deleted and everything about asking the host's rule lives in one file in the shared layer.

The reason that decided it is not tidiness: the rule *"with no requester, allowed"* lives inside that
wrapper, it is a plugin-wide rule rather than a translate-document one, and build step 8 of the design
is the step that changes it. Leaving it in a feature would mean step 8 editing a feature file to
change a rule that governs every path.

The alternative — follow the design's D4 literally, move three names, leave the wrapper — was offered
and declined. Its cost was a one-function file importing everything it uses, and two mock paths in the
tests instead of one.

## Result — every criterion walked with its declared check

| AC | Evidence | Verdict |
|---|---|---|
| AC1 | `shared/access/permission.ts` declares all four names; `features/translate-document/translationPermission.ts` is deleted | met |
| AC2 | one file under `shared/` still imports `features/` — `accessIsNotOptional.pins.ts`, which the criterion named; `swallowOrThrow.test.ts` is off the list | met |
| AC3 | `collections.ts` declares 2; `collection-utils.ts` declares 1 | met |
| AC4 | **2491 passing** (was 2490). The delta is one check, proved rather than assumed: adding a scratch file under `src/server` took `every-throw-is-a-translator-error` from 260 to 261 and removing it took it back, so the per-file suite counts one check per source file and this change nets one new file. **0** changed assertion lines | met |
| AC5 | `turbo run build` exit 0 | met |
| AC6 | `check-types` 0 in the package and in `apps/dev`; `sp-lint-delta` `mode=two-run`: nothing introduced | met |
| AC7 | `bun run test:integration`: **225 passed / 8 skipped**, unchanged | met |
| AC8 | `diff` against the pre-move copies: `permission.ts` differs in **two import lines only**; the moved visibility helpers are byte-identical; both error classes are byte-identical to `HEAD` | met |

`sp-diff-checks`: clean, 5 checks, no findings.

**The predicted trap fired, and loudly.** `enqueue-translation/__tests__/handler.test.ts` mocked
`_lib/collection-utils.js` and supplied `getAllCollectionIds`; move 2 took that function elsewhere, so
the mock stopped intercepting and the case **failed**. That is the good outcome — a mock that stops
intercepting can just as easily leave a green test that checks nothing. Interception was then proved
for `handler.access.test.ts` by mutation: pointing its mock at a module that does not exist took five
of seven cases red.

## Review log

### 2026-10-25 — comment audit: not run, and why

The change added **zero** comments. Every docblock travelled verbatim with the function it belongs
to, which a byte-level diff against the pre-move copies confirms. One comment was deleted — the
narration `// Mock collection-utils` above a mock block that the split made inaccurate anyway. The
mechanical half of the audit was done inline instead: the only citation inside a moved file is
`collections/operations/find.js`, a Payload-internal path the move does not affect.

### 2026-10-25 — one review angle (low risk)

**No findings.** The reviewer diffed both new files against the pre-move copies and confirmed the
bodies are byte-identical apart from import paths, checked that the moved test's other relative paths
still resolve from their new directory, and confirmed the two error classes are unchanged from `HEAD`.

The part worth recording is the mock check, because that was this task's only real risk. All four
mocking suites were verified by resolving each mock path by hand against the import the production
code now makes:

| suite | mocks | the module the code imports |
|---|---|---|
| `handler.access`, `handler.enforce`, `handler.spend` | `../../../shared/access/permission.js` | the same file `targetDocument.ts` imports |
| `enqueue-translation/__tests__/handler.test.ts` | `_lib/collection-utils.js` **and** `shared/payload/collections.js` | the handler imports one name from each |

The reviewer also confirmed what a split could have changed silently and did not: `mayWrite` and
`checkTranslationPermission` are still in one file, so mocking one from outside still cannot reach
the other, and the three suites mean exactly what they meant before.

**Found by the reviewer, not fixed here:** `features/_lib/index.ts` re-exports `collection-utils.js`,
which now holds one function, and nothing imports that barrel — every consumer imports the file
directly. A dead barrel, recorded below.

## Follow-ups — recorded, not done here

1. **`features/_lib/index.ts` is a dead barrel.** It re-exports one function nobody takes through it.
2. **`shared/access/__tests__/accessIsNotOptional.pins.ts` still imports from `features/`.** It pins
   that the plugin's config refuses to build without an access guard, so the import is of the plugin's
   own surface rather than of a feature's internals. Left alone; it is the one remaining
   `shared → features` edge and the criterion names it.
