# Remove the names nothing calls

Implements step 2 of the §9 order of work in
[2026-10-18-the-rewiring.md](./2026-10-18-the-rewiring.md), part one of two — the
mechanical removals. Part two is the `experimental.inlineMarks` flag, in its own pull
request. That document numbers its steps in prose rather than in the machine-readable
form the plan gate expects, so it is cited here rather than linked as a `Build step:`.

## Requirements / Task restatement

Four public aliases kept for backwards compatibility come out, along with the internal
alias behind one of them. Every one is already annotated `@deprecated` and listed in
`docs/DEPRECATIONS.md` as *remove in the next major*; none is referenced anywhere in this
repository outside its own declaration and one test.

In scope:

- **A.** `TranslateCollectionPlugin`, `TranslateCollectionPluginConfig`,
  `createTranslatePlugin`, `translateKitField`, `TranslateKitFieldConfig` — removed from
  the code and from `src/index.ts`.
- **B.** the internal alias `getTranslateKitFieldConfig` and the internal type alias
  `TranslateKitFieldConfig` under `core/domain/field-config/`, plus the two re-exports of
  them in `server/shared/index.ts`.
- **C.** `DEPRECATIONS.md`: the four entries above move to `removed`; the legend gains the
  `removed` status it is already using in two entries without documenting.
- **D.** the README table rows — **proposed in the reply, not edited here**.

Out of scope, each because another step owns it: `OpenAITranslationProvider` /
`createOpenAIProvider` (step 8, `openai-client-construction` removes the whole
client-building layer with them), the `experimental.inlineMarks` flag (part two of this
step), and the nine remaining ledger entries (steps 5, 6 and 8).

## What already exists — platform · installed · project · verdict

Nothing new is built. This change only deletes symbols and moves one function body that
already exists, so the ladder in `investigate.md` has nothing to climb. No search.

## Decisions

**D1 — the plugin body moves into `translatorPlugin`; the class is not kept privately.**

`TranslateCollectionPlugin` is not an alias. `translatorPlugin` is implemented as
`new TranslateCollectionPlugin(config).init()` (`src/plugin.ts:169`), so the class holds
the entire plugin body and deleting it has to put that body somewhere.

*Chosen:* inline `init()`'s returned function into `translatorPlugin` directly.
*Rejected — keep the class, unexported.* It has one method, holds no state between calls,
and stores `pluginConfig` in a field only to read it in the method below. Its constructor
would have exactly one caller, one line away. The class exists because the public API used
to be a class, and that is the thing being removed.
*Rejected — extract the body into a new named function.* No second caller exists or is
foreseen, so it is a name for the sake of a name.
*Constraint cited:* `grep` over the whole repository finds the class constructed in one
place, `src/plugin.ts:169`, and named nowhere else outside its own declaration and the
export line.

**D2 — the two field-config re-exports in `server/shared/index.ts` are dropped, not renamed.**

That barrel re-exports `getTranslateKitFieldConfig` and the type `TranslateKitFieldConfig`
— the deprecated names only, never the current ones — and nothing in the repository imports
either from it. The one name the server half actually uses from that block,
`isFieldExcludedFromTranslation` (`server/features/translate-field/resolveFieldSubtree.ts:1`),
stays.
*Rejected — rename them to `getFieldTranslationConfig` / `FieldTranslationConfig`.* That
adds a re-export with no importer, which is the same dead weight under a better name.

**D3 — the commit carries a `BREAKING CHANGE:` footer, and the header carries no `!`.**

`.releaserc.json` sets no `preset`, so `@semantic-release/commit-analyzer` loads the
`angular` one, whose header pattern is
`/^(\w*)(?:\((.*)\))?: (.*)$/` (`node_modules/conventional-changelog-angular/src/parser.js:3`)
— a `!` before the colon makes the header fail to parse at all, so a `feat!:` commit is not
read as breaking and may not be read as a release at all. The same preset's
`noteKeywords: ['BREAKING CHANGE']` (line 9) is what the analyzer's
`{ breaking: true, release: "major" }` rule fires on.
This is already recorded in `DEPRECATIONS.md#runner-create-takes-the-context`; D3 only
applies it.

**Shape check:** not run — none of its four triggers fires. No field is added to any type,
no exported function gains a parameter, nothing optional is introduced. The change is
deletions plus one function body moved.

**New surface:** none.

**Written contract owed:** none. No unit here gains an obligation its signature cannot
state; `translatorPlugin`'s signature is unchanged.

**Escalate to a design pass?** No. Placement is settled by the step this implements, and
the only decision with two real answers is D1, taken above.

## Acceptance Criteria

All commands run from `packages/payload-plugin-translator` unless stated.

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | The four deprecated names are gone from the package entry | `grep -c "TranslateCollectionPlugin\|createTranslatePlugin\|translateKitField\|TranslateKitFieldConfig" src/index.ts` | prints `0` |
| AC2 | …and from the published type declarations, so a consumer's build breaks rather than their runtime | from the repo root `bunx turbo run build --filter='@focus-reactive/payload-plugin-translator'`, then `grep -c "TranslateCollectionPlugin\|createTranslatePlugin\|translateKitField\|TranslateKitFieldConfig" dist/index.d.ts` | build exits 0; grep prints `0` |
| AC3 | `translatorPlugin` builds the same Payload config with the class inlined | `bunx vitest run src/__tests__/plugin.test.ts src/__tests__/plugin.access.test.ts` | exit 0, every case runs |
| AC4 | The translator behaves unchanged end to end | from `apps/dev`, after the AC2 rebuild: `bun run test:integration:sqlite` | the same counts as the pre-flight baseline, no new failure |
| AC5 | The internal alias is gone and nothing imports it | `grep -rn "getTranslateKitFieldConfig\|TranslateKitFieldConfig" src` | prints nothing |
| AC6 | No new type errors, in the package or in the sandbox that consumes it | `bun run check-types`; from `apps/dev` `bun run check-types` | both report no error |
| AC7 | No new lint findings | `bunx oxlint .`; from `apps/dev` `bunx oxlint src` | 45 and 5 warnings or fewer, 0 errors |
| AC8 | The change does not reach into step 8's area: the OpenAI client layer is untouched | `git diff --name-only` from the repo root | names no file under `src/translation-providers/`, and `grep -c "OpenAITranslationProvider" src/index.ts` still prints `1` |
| AC9 | The change does not reach into part two's area: the inline-marks flag is untouched | `git diff --name-only` | does not name `src/settings.ts`, and `grep -c "inlineMarks" src/settings.ts` is unchanged at `4` |
| AC10 | The ledger records the removal instead of losing it | read `docs/DEPRECATIONS.md` | the four entries of part A carry `**Status:** removed` and a `**Removed:** 2026-10-19 / PR <n>` line; the Status legend documents `removed` |

AC8 and AC9 are the unhappy path for a deletion task: the failure mode here is deleting
more than the step owns, and both fail visibly if it happens.

## Pre-flight

Run against the untouched tree on 2026-10-19, branch `major/translator` at `551ef347`.

| AC | Command | Result now | Kind |
|---|---|---|---|
| AC1 | `grep -c … src/index.ts` | `4` | **change** — fails now, as it must |
| AC2 | `grep -c … dist/index.d.ts` | not run; `dist/` is not built in the working tree. The names are in `src/index.ts`, which the build emits, so the post-build count is `4` by construction | **change** |
| AC3 | `bunx vitest run src/__tests__/plugin*.test.ts` | part of the full run below | **invariant** — passes now |
| AC4 | `bun run test:integration:sqlite` | **not run in pre-flight** — needs the plugin rebuilt into `dist` first. Baseline taken from the last recorded run of this suite: 235 passed / 7 skipped | **invariant** |
| AC5 | `grep -rn "getTranslateKitFieldConfig\|TranslateKitFieldConfig" src` | 9 lines across 4 files | **change** — fails now |
| AC6 | `bun run check-types` | 0 errors | **invariant** — passes now |
| AC7 | `bunx oxlint .` | 45 warnings, 0 errors | **invariant** — passes now |
| AC8 | `grep -c "OpenAITranslationProvider" src/index.ts` | `1` | **invariant** |
| AC9 | `grep -c "inlineMarks" src/settings.ts` | `4` | **invariant** |
| AC10 | read `docs/DEPRECATIONS.md` | the four entries say `live`; the legend lists only `live` and `planned` although two other entries already use `removed` | **change** — fails now |

Full suite baseline: `bunx vitest run` → 151 files, 2110 tests, all passing.

## Risk notes

- **Risk: low.** Deletions of symbols with no caller in this repository, plus one function
  body moved without changing what it does. The type-checker and the build catch a missed
  reference; `plugin.test.ts` and the sqlite integration suite catch a behaviour change.
- **The one thing that is not a deletion** is D1's body move. It is the only place a
  mistake can hide, which is why AC3 and AC4 both point at it.
- **Breaking for consumers outside this repository**, by design. Nobody is known to use
  these names — they have been annotated since before the deprecations ledger existed —
  but the package cannot know that, hence AC2: the failure must arrive at their build.
- **A `!` in the commit header would silently cost the major.** D3 covers it; the risk is
  that a later commit on this branch forgets and the footer convention is not visible in
  the header.

## Human choices

- **2026-10-19** — the owner split step 2 into two pull requests: parts A–C here, the
  `experimental.inlineMarks` flag separately, "потому что это единственное место с
  настоящим изменением поведения, и его стоит смотреть в отрыве от механической уборки".
- **2026-10-19** — the owner asked for the internal alias to go in the same change
  ("и переименование тоже"), after it was raised as optional.
- **2026-10-19** — `OpenAITranslationProvider` was moved out of this change and into step 8
  on the finding that `openai-client-construction` already owns it; accepted.
- **2026-10-19** — asked whether the package should unify on classes or on functions, the
  owner chose **classes inside, functions at the public boundary**: a unit implementing a
  named port or holding state between calls is a class; the configuration surface a host
  writes, and the ports a host implements, are functions and objects. A module stays the
  object literal D1–D22 drafted. To be recorded as an ADR in its own change.
  D1 above is unaffected and was confirmed at the same time: `translatorPlugin` is the
  public boundary, so its body belongs in the function.

## Review log

### 2026-10-19 — one reviewer on the working diff, low risk

Verified the inlining line by line, which is the only part of this change that is not a
deletion: the statements are identical and in the same order, `this.pluginConfig` became
the `pluginConfig` parameter in both of its uses, and renaming the outer parameter
un-shadowed the inner `config`, which is the Payload config `applyTo` receives. A
repo-wide grep found no dangling reference and no unused import left behind.

One finding accepted and fixed in this change:

- **`DEPRECATIONS.md` "Removal policy" contradicted D3.** The bullet told whoever releases
  to land removals as a single `feat!:` commit — the one form the repository's commit
  analyzer cannot read, which would silently cost the major. The bullet was not in the
  diff, but this change is what makes it the live instruction. Rewritten to require an
  ordinary header plus a `BREAKING CHANGE:` footer, with the reasoning linked to the
  `runner-create-takes-the-context` entry that first measured it.

One finding carried, not fixed:

- **The four `Removed:` lines name PR #184, which does not exist yet.** Confirm the number
  when the pull request is opened and correct the lines if it differs.

One finding out of scope by agreement: the README migration table still lists the removed
names. Part D of this contract leaves that edit to the owner.

### Acceptance criteria — final walk

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | met | `grep -c … src/index.ts` → `0` |
| AC2 | met | `turbo run build` exits 0; `grep -c … dist/index.d.ts` → `0` |
| AC3 | met | `bunx vitest run src/__tests__/plugin.test.ts src/__tests__/plugin.access.test.ts` → 2 files, 37 tests, all passing |
| AC4 | met | `bun run test:integration:sqlite` → 237 passed / 7 skipped, no failure. The baseline recorded 235; the branch has gained tests since, and none of the gain is in this diff |
| AC5 | met | `grep -rn "getTranslateKitFieldConfig\|TranslateKitFieldConfig" src` → no output |
| AC6 | met | `check-types` in the package and in `apps/dev` → 0 errors each |
| AC7 | met | `oxlint .` → 45 warnings / 0 errors; `oxlint src` in `apps/dev` → 5 / 0. Both equal to the pre-flight baseline, and `sp-lint-delta` reports no finding introduced |
| AC8 | met | `git diff --name-only` names no file under `src/translation-providers/`; `grep -c "OpenAITranslationProvider" src/index.ts` → `1` |
| AC9 | met | `git diff --name-only` does not name `src/settings.ts`; `grep -c "inlineMarks" src/settings.ts` → `4`, unchanged |
| AC10 | met | the four entries carry `**Status:** removed` and a `**Removed:**` line; the Status legend documents `removed`; the Removal policy bullet now matches D3 |

Gates: `sp-diff-checks` clean, 5 checks, no findings. `sp-lint-delta` — no findings
introduced, over 457 lines of analyzer output.

### 2026-10-19 — four further passes over the same diff

**Complexity.** No finding. For the recurring scenario the history shows — *add a module
that takes part in the translation itself*, six times over — the counters read CHANGE 13,
READ 6, STATE 16. The change moved READ from 7 to 6, because `translatorPlugin` no longer
sends a reader to a class declaration above it to find out what the plugin does. CHANGE 13
is recorded as the baseline step 4 will be graded against.

**Abstraction.** Two findings, both proposals, neither applied here:

- **`collections: CollectionConfig[]` demands more than the entry reads.** The JSDoc asks
  for the same objects passed to `buildConfig`; `apps/cms/src/lib/plugins/index.ts:345`
  passes deep clones with the functions stripped, and nothing breaks — because the entry
  reads only `slug`, `fields` and `custom`. A narrow shape for this already exists in the
  package (`ConfigurableCollection`, `AutoTranslate.wiring.ts:20`). Note the tension: the
  package guide explicitly allows full Payload types at `plugin.ts`, so this argues with a
  written convention rather than violating one.
- **Two of the entry's exports are surplus.** Probed with the compiler, not argued: a
  consumer that builds the config separately and declares a field exclusion compiles with
  `TranslatorPluginConfig` and `FieldTranslationConfig` deleted from its import, because
  contextual typing reaches both. ADR-0002 says publish only what a consumer must name, and
  a major is the cheap moment. 2 of 27 probed; the other 25 were not.

**Red test, audit mode.** `translatorPlugin` was redirected to a stub and the two files
covering it re-run: **37 of 37 went red, 0 passed, no resolution errors, and every failure
was the stub's own.** Nothing in that suite is tautological. Four mutations then probed the
body move: removing `addAdminProvider` turns 2 red, dropping the level extension turns 6
red, and **handing `applyTo` the plugin's own config instead of the Payload config — the
exact mistake this change could have made — turns only 1 of 37 red**, so the compiler is
the primary guard there and the suite the thin backup. Reordering the config modifiers
turns nothing red, which proves nothing: that order is not declared behaviour.
Cost, counted rather than predicted: `plugin.test.ts` carries 27 doubles and 28 type
escapes against a package median of 0 — and every escape is `as unknown as Config` or
`as unknown as TranslatorPluginConfig`, which is the first abstraction finding showing up
from the other side.

**Comment audit.** Seven blocks collected, seven judged, plus two missing explanations.
The diff added no comment of its own. Applied: three restatements deleted, one
four-line docblock cut to the single constraint it carried (the dropped fact is recorded
where it belongs, `TranslateFieldControl.tsx:48,86`), the inner callback parameter renamed
`config` → `payloadConfig` so the near-collision with `pluginConfig` stops being a thing to
notice, one line added over `if (!access)` saying the branch exists for a plain-JavaScript
caller, and the `@example` on `translatorPlugin` rewritten off `createOpenAIProvider` —
which step 8 deletes — onto `createTranslationProvider` + `openAIComplete`, matching the
README recipe. Kept: the two section banners in `server/shared/index.ts`, because that file
carries about eight of them and removing two leaves it half-edited; a pass over all of them
is its own change.

Checks after every edit above: `check-types` 0 errors, `oxlint` 45 warnings / 0 errors
(baseline unmoved), `vitest` 2110 of 2110.
