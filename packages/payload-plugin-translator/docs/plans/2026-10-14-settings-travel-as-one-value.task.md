# Settings travel as one value, not as a handful of scalars

Follows: 2026-10-14-the-panel-shows-what-is-happening.task.md

## Requirements / Task restatement

`TranslationContext` (`src/server/modules/translation-levels/types.ts:19`) carries ten readonly
fields in a flat list. Four are **resolved settings**; six are wired dependencies. Adding a setting
means writing its name into every layer that merely passes it along, and into every fixture that
builds a context.

Measured on `failedWindowMs`, the setting added last week — `grep -rn failedWindowMs src ../../apps/dev/src`
returns 30 mentions over 20 files. Split by what the mention does:

| Kind | Sites | Where |
|---|---|---|
| **Carriage** — names the setting only to hand it on | **13** over 8 files | `types.ts:22` · `PluginConfigBuilder.ts:72,89` · `useDocTranslationApi.ts:21` · `createTranslationRoutes.ts:20,40,54` · `plugin.ts:160,194` · 4 fixtures |
| Declaration | 2 | `plugin.ts:61` (option), `plugin.ts:19` (default) |
| Reading | 15 | the status handler, the HTTP body, the client panel, `apps/dev` — all genuine |

Carriage is the only kind this task removes. Reading is what a setting is *for* and must stay.

## What already exists — platform · installed · project · verdict

- **Project.** `src/types/` already holds leaf types that both `plugin.ts` and the server modules
  name — `TargetSelection.ts`, `AccessGuard.ts`, `CollectionSchemaMap.ts`. The import edge a module
  needs (`translation-levels/types.ts` → a shared declaration above it) is the one it already has
  four times.
- **Project.** `src/server/modules/task-runner/__tests__/TaskRunner.invariants.ts` is the precedent
  for a non-`.test.ts` file under `__tests__` shared by several suites — but this task needs no such
  file, see D3.
- **Verdict.** One new file, no dependency, no pattern the package does not already use.

## Decisions

### D1 — the four settings become one named value on the context

**Chosen:** `TranslationContext` loses `basePath`, `failedWindowMs`, `targetSelection` and
`inlineMarks`, and gains `readonly settings: TranslatorSettings`.

**What lost:** leaving it alone. It lost on the 13 carriage sites above — a measured recurring cost,
and the package has added five settings before this one.

**The constraint it cites:** `PluginConfigBuilderDeps = TranslationContext` and
`TranslationRoutesDeps = Pick<TranslationContext, …>` already derive from the context, so the layers
between `plugin.ts` and a feature never *read* these four values — they only relay them. A relay
should carry one parcel, not unpack and repack four.

### D2 — the option and its resolved form are declared in the same file

**Chosen:** a new `src/settings.ts` holding all four of:

```ts
export type TranslatorSettingsOptions = { basePath?: string; failedWindowMs?: number;
                                          targetSelection?: TargetSelectionMode;
                                          experimental?: { inlineMarks?: boolean } };
export type TranslatorSettings = { basePath: string; failedWindowMs: number;
                                   targetSelection: TargetSelectionMode; inlineMarks: boolean };
export const DEFAULT_FAILED_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
export const resolveSettings = (o: TranslatorSettingsOptions): TranslatorSettings => …
```

and `plugin.ts` composing the public type: `TranslatorPluginConfig = TranslatorSettingsOptions & { …the other seven fields }`.

**What lost, and why — two candidates, and the first is what the original task description assumed:**

- **`Required<Pick<TranslatorPluginConfig, …>>`.** Wrong, because the context's values are *resolved*,
  not raw: `basePath` is `normalizePath(rawBasePath)`, and `inlineMarks` is
  `experimental?.inlineMarks === true` — there is no top-level option of that name. A derived type
  would claim the context holds what the caller passed. It does not.
- **Declaring `TranslatorSettings` alone and leaving the options in `plugin.ts`.** Lost on the
  arithmetic: a new setting would then cost three files (option, resolved type, default), and
  `settings.ts` would have to `Pick` from `plugin.ts` while `plugin.ts` imports the resolver — a
  cycle. Composing the public type out of the settings options removes both at once.

**What this buys, stated as a count rather than a feeling:** the next setting costs **two files,
three edits** — `settings.ts` (option field, resolved field, default) and the one place that reads
it. Carriage goes to **zero**. Today it is eight files and fifteen edits for the same setting.

### D3 — the parcel is opened at `createTranslationRoutes`, and no deeper

**Chosen:** `TranslationRoutesDeps` takes `settings: TranslatorSettings`; inside, the eight route
factories keep receiving `basePath` as the positional argument they take today, and
`createGetCollectionStatusRoute` keeps receiving `failedWindowMs` in its config. Below that line the
diff is empty. The four fixtures write `settings: resolveSettings({})` — one line, and a new setting
costs them nothing, which is why no shared test fixture is needed.

**What lost, and why:** pushing `settings` down to the leaf factories. It lost on the project's
standing rule — *demand only what you touch*: `createCancelRoute` uses `basePath` and nothing else,
and a parameter whose other three fields it ignores is a signature that lies about what the answer
depends on.

### D4 — `PluginConfigBuilder` keeps naming its fields

**Chosen:** one property per context field; after D1 that is seven instead of ten.

**What lost, and why:** having the class hold `deps` whole lost on a hard constraint —
`PluginConfigBuilder implements LevelContext`, and `LevelContext extends TranslationContext`, so the
fields must exist **on the instance**. The alternative is seven getters: the same line count plus an
indirection.

### Placement

| Piece | Lands in |
|---|---|
| `TranslatorSettingsOptions`, `TranslatorSettings`, `DEFAULT_FAILED_WINDOW_MS`, `resolveSettings` | `src/settings.ts` (new) |
| `TranslatorPluginConfig` composed from the options; one `resolveSettings` call in `init()` | `src/plugin.ts` |
| `readonly settings` replacing four scalars | `src/server/modules/translation-levels/types.ts`, `PluginConfigBuilder.ts` |
| relaying one field instead of two | `src/composition/levels/useDocTranslationApi.ts` |
| opening the parcel | `src/server/features/createTranslationRoutes.ts` |
| `ctx.settings.<name>` at the readers | `src/composition/levels/{documentLevel,collectionLevel,fieldLevel}.ts` |

Logic lives in `src/settings.ts` rather than `src/types/`, because `src/types/` holds declarations
with no behaviour and `resolveSettings` has defaults and a `normalizePath` call.

### New surface

`TranslatorSettings` (callers: the context, the builder, the three levels, the route bundle) and
`resolveSettings` (callers: `plugin.ts` and four fixtures). **Neither is added to `src/index.ts`** —
per ADR-0002, `TranslatorPluginConfig` stays the consumer-facing name and contextual typing covers
the rest.

### Written contract?

**None.** `resolveSettings` is total, pure, and says everything in its signature except the four
defaults, which `@default` tags on the option fields already carry. No contract-first tests needed.

### Does this need a separate design?

**No.** It regroups fields on an internal type that four other internal types already derive from.
No new seam, no dependency, no data-model change.

## Acceptance Criteria

| AC | Criterion | How it is checked | Passes when |
|---|---|---|---|
| AC1 | No carriage layer names an individual setting | `grep -rnE "readonly (basePath\|failedWindowMs\|targetSelection\|inlineMarks)" src/server/modules/translation-levels/` | no match |
| AC2 | No context fixture names an individual setting | `grep -rn "failedWindowMs" src/composition/levels/*.test.ts src/server/modules/translation-levels/*.test.ts src/server/features/createTranslationRoutes.test.ts` | no match |
| AC3 | Carriage for one setting is gone end to end | `grep -rln "failedWindowMs" src` | the 8 carriage files are absent; only `settings.ts`, the status feature, and the client remain |
| AC4 | The public option surface is unchanged for a consumer | a scratch file assigning `{ basePath, failedWindowMs, targetSelection, experimental, … }` to `TranslatorPluginConfig` | compiles with no export added to `src/index.ts` |
| AC5 | Behaviour unchanged in the package | `bunx vitest run` | ≥ 2088 pass, 0 fail |
| AC6 | The settings reach the admin surfaces end to end | `apps/dev`: rebuild the plugin, then `bun run test:integration:{sqlite,postgres,mongo}` | ≥ 235 / 240 / 233 pass |
| AC7 | A non-default `basePath` still arrives normalised | the existing `plugin.test.ts:104` case (`build({ basePath: "/i18n" })`) | passes unchanged |
| AC8 | No new type errors | `bun run check-types` here and in `apps/dev`; `bunx tsc --noEmit -p tsconfig.json` in `apps/dev` | 0 · 0 · 2 (the two pre-existing, in files this task does not touch) |
| AC9 | No new lint findings | `bunx oxlint .` | ≤ 46 warnings, 0 errors |

## Pre-flight — run against the untouched tree

| AC | Result now | Classification |
|---|---|---|
| AC1 | **8 matches** (`PluginConfigBuilder.ts:71,72,78,79` · `types.ts:21,22,33,34`) | change — must reach 0 |
| AC2 | **4 matches** (`PluginConfigBuilder.test.ts:11` · `levels.test.ts:33` · `fieldLevel.test.ts:15` · `createTranslationRoutes.test.ts:14`) | change — must reach 0 |
| AC3 | **13 carriage sites over 8 files** | change — must reach 0 |
| AC4 | compiles | invariant — must keep compiling |
| AC5 | 2088 passed / 150 files | invariant (baseline) |
| AC6 | 235 / 240 / 233 | invariant (baseline) |
| AC7 | passes | invariant |
| AC8 | 0 · 0 · 2 | invariant |
| AC9 | 46 warnings, 0 errors | invariant |

AC1's pre-flight corrects the figure this contract first carried: it said 4, the grep returns 8, because `PluginConfigBuilder` restates every field the context declares.

## Risk notes

**Risk classification: LOW.** Nothing public changes — `TranslationContext` and `LevelContext` are
deliberately unexported, and the docblock on `TranslationLevel` says so: *"not externally
implementable yet, since LevelContext is intentionally not exported"*. Behaviour is unchanged, and
every relay is typed, so a mis-wired field is a compile error rather than a runtime surprise. That
buys one review pass rather than three, and a sweep over the four derived types rather than an
evidenced sweep of everything.

**Hazards:**

- `inlineMarks` is read by `wireTranslateRunner` **before** the builder is constructed
  (`plugin.ts:177`). `resolveSettings` must therefore be called early in `init()`, right after the
  `access` check, not beside the builder.
- `basePath` is normalised after destructuring today (`plugin.ts:174`). The normalisation moves
  inside `resolveSettings`; if it is dropped, a custom base path silently loses it and only AC7
  catches it.
- Moving the four option declarations into `src/settings.ts` moves their JSDoc. A reader opening
  `plugin.ts` to find `basePath` will no longer see it there. `TranslatorPluginConfig` remains the
  exported name and hover text still resolves through the intersection, but this is a real
  readability cost paid for the arithmetic in D2.
- `StalenessConfig` picks `provenanceServiceFactory` — a dependency, not a setting. It must come
  through untouched; if it changes, the settings/dependency split was drawn wrong.

## Decisions by the owner

- **2026-10-14** — do it now rather than defer; the backlog is already large.
- **2026-10-14** — no deprecation window for the context fields. Considered, and dropped once the
  types were shown to be unexported, so there is no consumer to keep compatible.
- **2026-10-14** — not a one-field first step. Starting with `failedWindowMs` alone was considered
  and rejected, because it leaves two ways to pass a setting with nothing forcing the new one, and
  pays the full plumbing cost for none of the gain.

- **2026-10-14** — the four option declarations move into `src/settings.ts` (D2 as written), chosen
  before implementation over keeping them in `plugin.ts`. The owner accepted the readability cost named
  in the hazards — `plugin.ts` no longer shows `basePath` — in exchange for one declaration site per
  setting and no hand-written duplicate of the option shape.

## Verification — 2026-10-14, after implementation

| AC | Result | Verdict |
|---|---|---|
| AC1 | the grep returns nothing (was 8) | met |
| AC2 | the grep returns nothing (was 4) | met |
| AC3 | carriage gone from all 8 files. `failedWindowMs` now lives in `settings.ts` (declaration), `createTranslationRoutes.ts` (1 site, where the parcel opens), the status feature (4) and the client (5) — declaration and reading only | met |
| AC4 | a scratch consumer assigning all 11 option fields to `TranslatorPluginConfig` compiled; `src/index.ts` unchanged | met |
| AC5 | `2097 passed (2097)` over 151 files — the 2088 baseline plus 9 new | met |
| AC6 | sqlite `235 passed / 7 skipped` · postgres `240 passed / 2 skipped` · mongo `233 passed / 9 skipped` — all three at baseline | met |
| AC7 | `plugin.test.ts` "threads a custom basePath into every endpoint" passes unchanged | met |
| AC8 | package `0` · `apps/dev` check-types `0` · `apps/dev` tsconfig.json `2` (`payload.config.ts:166`, `vitest.integration.config.ts:21` — both pre-existing, untouched) | met |
| AC9 | `Found 46 warnings and 0 errors` here; `5 warnings` in `apps/dev` | met |

The real `tsc` declaration build (`turbo run build`) was run as well, not only tsgo — it compiled
377 files and emitted declarations cleanly.

### Prevention

`src/settings.ts` is new code holding four defaults and one normalisation, and nothing covered them
directly: only `basePath` had a plugin-level case. `src/settings.test.ts` closes that with 9 checks,
each proven by a mutation that was reverted afterwards:

| Mutation | Caught by | Other checks |
|---|---|---|
| `??` → `\|\|` on `failedWindowMs` | "keeps a window of zero instead of reading it as unset" | 8 stayed green |
| dropped `normalizePath(…)` | "normalises a base path the caller wrote loosely" | 8 stayed green |
| `inlineMarks === true` → `!== false` | the two absent-`experimental` cases + "fills every setting from nothing" | the explicit-value cases stayed green |

The `??` mutation is the one worth having: `\|\|` would silently replace an explicit
`failedWindowMs: 0` — "report no failures at all" — with the three-day default.
