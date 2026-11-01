Build step: ./2026-10-28-the-provider-port.design.md #1

# Step 1 — the tidy

## Requirements / Task restatement

Make the provider area readable before its signatures change. Four pieces, none of which alters
behaviour:

1. **Tests move to `__tests__`**, package-wide. 83 files sit beside their source while 124 sit in
   `__tests__`; the convention exists and is two-thirds kept.
2. **`failureReason` leaves the seam.** `core/domain/translation-providers/` holds the provider
   contract and a helper about presenting a reason to a human, whose six callers are access errors,
   translation errors and the HTTP layer — none of them a provider.
3. **`shared/errors/` shrinks.** Ten files for one taxonomy, of which four are three-line classes
   carrying nothing but a `code` literal.
4. **Three constraints become structural.** The comments explaining them were deleted from
   `OpenAITranslation.provider.ts` on 2026-10-28; the facts they carried are real, so the code has
   to say them instead.

**No signature changes, no behaviour changes.** The reshape is step 2.

Covers R6 and R7 of the design.

## What already exists — platform · installed · project · verdict

- **Platform.** Nothing used that the project does not already use.
- **Installed.** Nothing added.
- **Project.** `__tests__` is the package's own convention, stated nowhere but followed by 124
  files. `core/errors/` already holds `TranslatorError`, `TranslatorBug` and `TranslatorConfigError`
  — the home `failureReason` is missing.
- **Verdict.** Nothing is designed here. Every move lands on a place the package already has.

## Decisions

**D1 — `failureReason` goes to `core/errors/`, not to a new folder.**
Chosen: `core/errors/failureReason.ts`, beside `TranslatorError`. Lost: a new `core/domain/failures/`
folder, and leaving it where it is with a barrel export. Its subject is a marker on an error message
and its callers are all error types or the layer that renders them; `core/errors/` is where those
live. A new folder would add a place to look for one file.

**D2 — WITHDRAWN. `shared/errors/` keeps one file per class.**
Proposed: collapse `NoContentError`, `UnparseableReplyError`, `TransportError` and
`ProviderConfigurationError` into `TranslationProviderError.ts`, since each is three lines carrying
only a `code`.

Withdrawn after it was built: the project's lint enforces `max-classes-per-file: 1`, and the collapse
raised `eslint(max-classes-per-file): File has too many classes (5). Maximum allowed is 1`. The ten
files are not sprawl — they are what that rule produces. The observation that led here mistook an
enforced convention for a mess, which is exactly the dismissal an audit is supposed to make before
proposing a cure.

Changing the rule is a package-wide decision and not this step's to take. R5 is therefore not met and
is recorded as such.

**D3 — the test move is package-wide, not provider-only.**
Chosen: all 83 files. Lost: moving only the 13 provider files. Doing it twice costs more than doing
it once, and a half-kept convention is the thing that made this worth fixing.

**D4 — the three constraints need nothing: they were already pinned by checks.**
Proposed: rework the code so each constraint is structural. Lost: putting the comments back.

On inspection all three are already guarded, and the deleted comments guarded nothing:

| Constraint | Check that fails if it breaks |
|---|---|
| the promise is cached, not the client, so two concurrent first calls share one import | `OpenAITranslation.provider.test.ts:454` — "loads the SDK once even when two first calls run concurrently" |
| a rejected promise is forgotten, so one bad first call is not permanent | `:469` — "retries the load after a failure instead of caching the rejection" |
| `apiKey` is never defaulted to `""` | `:480` — "passes a missing apiKey through as undefined rather than an empty string" |

So the removal was right and no rework is owed. Recorded because the opposite conclusion — that prose
had to become structure — was the one this step started with.

## Acceptance Criteria

| AC | Covers | Criterion | How it is checked | Passes when |
|---|---|---|---|---|
| AC1 | R6 | No test file sits outside `__tests__` | `find src -name '*.test.ts*' -not -path '*__tests__*' \| wc -l` | `0` |
| AC2 | R6 | Every moved test still runs | `bunx vitest run` | 207 files, ≥ 2527 passing, 0 failing |
| AC3 | R7 | `core/domain/translation-providers/` holds the contract and its barrel only | `ls src/core/domain/translation-providers/` | `TranslationProvider.interface.ts`, `index.ts` |
| AC4 | R7 | `failureReason` resolves from `core/errors/` for all six callers | `bun run check-types` | 0 errors |
| AC5 | R7 | `shared/errors/` keeps one class per file, as the lint rule requires | `bunx oxlint .` | 0 errors — **not met by a change; met by withdrawing D2** |
| AC6 | — | No new type errors | `bun run check-types` | 0 errors |
| AC7 | — | No new lint findings | `bunx oxlint .` | ≤ 35 warnings, 0 errors |
| AC8 | — | The real declaration build still passes | root: `bunx turbo run build --filter='./packages/payload-plugin-translator'` | exit 0 |
| AC9 | — | Integration unchanged on every adapter | `apps/dev` after a rebuild, three adapters | SQLite ≥ 247, PostgreSQL ≥ 253, MongoDB ≥ 245 passing; 0 failing |
| AC10 | — | The package's published surface is unchanged | `src/index.ts` diffed | no change |

## Pre-flight

Run against the untouched tree on 2026-10-28.

| AC | Command | Result | Kind |
|---|---|---|---|
| AC1 | `find src -name '*.test.ts*' -not -path '*__tests__*' \| wc -l` | **FAIL** — 83 | change |
| AC3 | `ls src/core/domain/translation-providers/` | **FAIL** — 4 files, `failureReason.ts` and its test among them | change |
| AC5 | `ls src/translation-providers/shared/errors/*.ts \| wc -l` | **FAIL** — 10 | change |
| AC2, AC6 | `bunx vitest run`, `bun run check-types` | **PASS** — 207 files / 2527 passing / 9 skipped; 0 type errors | invariant |
| AC7 | `bunx oxlint .` | **PASS** — 35 warnings, 0 errors | invariant |
| AC8 | `bunx turbo run build --filter` | **PASS** — exit 0 | invariant |
| AC9 | three adapters, measured 2026-10-28 before this step | **PASS** — SQLite 247/8, PostgreSQL 253/2, MongoDB 245/10 | invariant |
| AC10 | — | **PASS** — nothing changed yet | invariant |

### Baselines captured before any edit

| Measure | Value |
|---|---|
| package suite | 207 files, 2527 passing, 9 skipped |
| type errors | 0 |
| lint | 35 warnings, 0 errors |
| tests outside `__tests__` | 83 |
| files in `shared/errors/` | 10 |
| files in the seam | 4 |
| integration | SQLite 247/8 · PostgreSQL 253/2 · MongoDB 245/10 |

## Risk notes

- **The test move touches 83 files and every relative import inside them.** A path that resolves at
  type-check but not at run time, or the reverse, is the failure to watch for; AC2 and AC6 together
  catch it, and neither alone does.
- **`shared/errors/` is imported by name, not by file.** Collapsing classes into one file must leave
  the barrel's export list byte-identical, or a consumer that deep-imports breaks silently. AC5
  checks the list, not the count alone.
- **`apps/dev` consumes the built package.** Integration run without `turbo run build` first grades
  stale code and its numbers mean nothing.

## Human choices

- The three comments removed from `OpenAITranslation.provider.ts` were removed by the owner on
  purpose. D4 reworks the code rather than restoring them; if a rework turns out to cost more than
  the constraint is worth, the honest answer is to leave the code as it is and record the constraint
  in the design, not to put prose back.

## Review log

### Verification — 2026-10-28

| AC | Result |
|---|---|
| AC1 | **PASS** — `find src -name '*.test.ts*' -not -path '*__tests__*'` → 0 (was 83) |
| AC2 | **PASS** — 207 files, 2527 passing, 9 skipped — identical to the baseline |
| AC3 | **PASS** — the seam holds `TranslationProvider.interface.ts` and `index.ts` only |
| AC4 | **PASS** — all ten importers repointed to `core/errors/failureReason.js`; 0 type errors |
| AC5 | **PASS by withdrawal** — see D2. `shared/errors/` is unchanged at nine files plus its tests |
| AC6 | **PASS** — `bun run check-types` → 0 |
| AC7 | **PASS** — `bunx oxlint .` → 35 warnings, 0 errors (baseline 35/0) |
| AC8 | **PASS** — `bunx turbo run build --filter` exit 0; `bunx turbo run check-types` 9/9 |
| AC9 | **PASS** — SQLite 247/8 · PostgreSQL 253/2 · MongoDB 245/10, each equal to its baseline |
| AC10 | **PASS** — `src/index.ts` unchanged |

### Deviations from the contract

**D2 withdrawn after it was built.** The collapse of the four trivial error classes raised
`eslint(max-classes-per-file): File has too many classes (5). Maximum allowed is 1`. The ten files
are what that rule produces, not sprawl. Reverted in full; the suite returned to 2527 exactly.

**R5 is not met by this step.** It depended on D2. Moving `TranslationFailureCode` to `core/` is
step 2's work anyway, and whether `max-classes-per-file` should change is a package-wide question
this step has no standing to answer.

**D4 required no work.** All three constraints are already pinned by checks in
`OpenAITranslation.provider.test.ts` (`:454`, `:469`, `:480`). The deleted comments guarded nothing.

### Found along the way

- **Two tests read the filesystem by their own location**, so moving them broke paths no import
  rewrite touches: `no-payload-boundary.test.ts` (`dirname(import.meta.url)` was assumed to be
  `src/core`) and `importOpenAISdk.test.ts` (`join(__dirname, "loadOpenAIClient.ts")`). Both fixed
  with one `..`. This is the risk the contract named, and only AC2 caught it — `check-types` passed
  throughout.
- **`every-throw-is-a-translator-error.test.ts` generates one check per source file** under
  `server/` and `core/` (270 today). Deleting source files lowers the suite count without lowering
  coverage; this explained the 2527 → 2523 dip while D2 was in place, and it will explain any
  future dip when files are removed.
- **No test file is imported by another**, so the move needed no fixups outside the moved files.
