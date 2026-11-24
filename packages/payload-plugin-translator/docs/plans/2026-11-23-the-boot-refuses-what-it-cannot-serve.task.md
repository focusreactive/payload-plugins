# The config refuses what the plugin cannot serve

Requirements: `docs/plans/2026-11-19-fewer-worlds-louder-refusals.design.md`
Build step: 2026-11-19-fewer-worlds-louder-refusals.design.md #5

Builds the first of the three refusal layers of step 5. The world half of that step shipped in
`0f64c925`; the enumeration table it also named was retracted by the owner on 2026-11-20 and is not
revived here. Decision D3 of that design is the settled input, with the reductions recorded below.

## Requirements / Task restatement

Two host configurations make this plugin do the wrong thing in silence.

A target locale the project does not declare is dropped while the config is assembled, with a
warning. When **every** target is dropped, the warning has the same shape as the one for a single
mistyped locale, nothing else happens, and the host ships with auto-translate quietly off.

`versions.drafts.localizeStatus` turns `_status` into an object per locale. Two of this plugin's
decisions read `_status` as a string — the publish gate and the published-status filter the
baseline read uses. Neither notices. The name appears nowhere in the plugin's own code, so the
behaviour is not refused, not warned about, and not correct.

Both are the same failure and the same audience: the developer who wrote the configuration, who is
told nothing. Both are decidable while the configuration is being read, before a document is ever
saved — which is where this task refuses them.

The design's requirement ids are kept, so this contract traces to it directly.

- R2 (in, part) An unsupported combination refuses where the configuration is written, naming the
  collection, what is unsupported and the way out. This is layer 1 of the design's three.
- R8 (in, part) Zero surviving target locales stops being a silent no-op and becomes a refusal.
- R1 (in, part) The unsupported configuration is decided by one predicate in one file. The table
  that would have enumerated the supported set is not part of this — it was retracted.
- (out) **Layers 2 and 3 of the design's D3** — the boot re-check and the hook's refusal. They cover
  only the case where a *later* plugin changes a managed collection's world after this plugin has
  read it, and they carry the bulk of the work. Deferred by the owner; see the decisions below.
- (out) `AutoTranslateOutcome` as the hook's return type · any field on `DocumentTranslationState`
  for rendering a refusal in the admin · the scheduled-publish integration test · removing
  `publish_on_translation` · a 400 on a publish request in a collection with no drafts · the
  executor's settled-handle guard · the analyzer zone, dropped by the owner and recorded as an
  accepted deviation in the design.

## What this starts from (measured)

- `AutoTranslate.wiring.ts:54` `dropLocalesTheProjectDoesNotHave` filters each policy and warns;
  with every target dropped it stores an empty target list and returns.
- An existing unit case pins that silence: `AutoTranslate.wiring.test.ts`, "drops every target when
  none matches", asserts `[]` and passes. It is rewritten here, not deleted — the behaviour it pins
  is the defect.
- `plugin.ts:136,143,162` throw bare `Error` from `refuseAnUnusableConfig` and `refuseDuplicateNames`.
  `TranslatorConfigError` (`core/errors/TranslatorConfigError.ts:4`) exists and is already thrown at
  eight sites.
- `payload/shared` exports `hasLocalizeStatusEnabled` (`utilities/getVersionsConfig.js:9`), so the
  collection half of the predicate needs no hand-written reader.
- **Payload disables `localizeStatus` itself when the top-level experimental flag is absent**
  (`collections/config/sanitize.js:187-188`). Plugins run before sanitize, so a config-time check
  reading the collection alone would refuse a host whose setting Payload is about to turn off. Both
  halves must be read together; the flag is at `config.experimental?.localizeStatus`
  (`config/types.d.ts:1013-1017`).
- No application in this repository sets `localizeStatus` — `apps/cms` and `apps/dev` were searched.
- `resolveWorld` (`core/domain/world/world.ts:19`) has no refusal arm and knows nothing of
  `localizeStatus`; it answers `layered | single-layer` from `{ drafts, autosave }` only.
- `translatorPlugin` already calls `refuseAnUnusableConfig(pluginConfig)` as its first statement,
  holding both the host's raw collections and the raw `payloadConfig`.

## Decisions

### D1. The refusal is its own predicate; the world question is left alone

- **Chosen:** one function answering "is there a reason this plugin cannot serve this collection",
  taking the collection config and the experimental flag, returning a named reason or `null`.
  `worldOfCollection` is unchanged.
- **Why it bites:** the two questions have different inputs and different answers. The world is
  `drafts × autosave`; the refusal is about a setting that changes what `_status` *is*. Folding them
  would make `resolveWorld` — which lives in the payload-free core — depend on a Payload version
  flag.
- **Rejected — `worldOfCollection` returns `CollectionWorld | Refused`:** the stronger guarantee,
  because a refused collection's world would then be impossible to use by accident. It costs a new
  arm at fourteen call sites, eleven of which reach the entry only through `latestOf` and would have
  to handle a `VersionRead | null`, for a condition that is a configuration error caught before the
  application serves. More machinery than it removes.
- **Shape check fired on** "two predicates over the same input"; the two shapes above are the
  comparison.
- **Constraint cited:** the owner's selection rule for this work, and the package rule that
  `src/core` learns nothing about Payload.

### D2. Layer 1 alone, and the other two are deferred rather than dropped

- **Chosen:** the config-time refusal only. A world the host itself wrote stops the application at
  the moment the configuration is read.
- **Why:** layer 1 catches both configurations for every host that writes its own config, which is
  every ordinary host. Layers 2 and 3 exist only for a world introduced by a *later* plugin —
  `payload-plugin-scheduling` in this repository rewrites `versions.drafts`
  (`injectSchedulePublishToVersions.ts:9-12`) — and they carry the boot hook, the derivation in the
  read handlers, the hook change and three criteria needing a real Payload boot.
- **Rejected — all three layers now:** the right end state, and the wrong order with a major close.
  Nothing here has to be undone to add them: they widen coverage over the same predicate.
- **Consequence stated plainly:** a managed collection whose world another plugin changes after this
  plugin read it is still served wrongly and still says nothing. That gap is named, not closed.

### D3. The hard failure stays where the design put it

- **Chosen:** unchanged from the design's D3 layer 1 — a config-time refusal throws
  `TranslatorConfigError`, stopping the application before it serves.
- **Why:** it is the moment the configuration is read and the audience is the person who wrote it.
  The design priced the alternative for the *boot* layer, where a throw fails `payload.init` and
  takes the host's unrelated collections down; that reasoning does not apply here, because at config
  time nothing is serving yet.
- **Breaking for a host that already sets either configuration.** It ships in the major, announced
  by a `BREAKING CHANGE:` footer.

**New surface:** one predicate, internal to `src/server/shared/payload/`. `src/index.ts` is
unchanged.
**Written contract owed:** yes — the predicate owes its caller why both halves of the condition must
be passed, which its signature cannot state.
**Escalate:** no — a build step of an adopted design.

## Acceptance criteria

| # | Covers | Criterion | How it is checked | Pre-flight |
|---|---|---|---|---|
| AC1 | R8 | Every target locale dropped as unknown refuses, naming the collection, the dropped locales and the configured ones | `AutoTranslate.wiring.test.ts`, the existing "drops every target" case rewritten to expect the throw | **fails now** — it asserts `[]` and passes |
| AC2 | R8 | One target surviving out of several stays a warning and keeps the survivors | same file, the existing "drops a target no locale matches" case | **passes now** — a stays-true criterion |
| AC3 | R8 | A project with no localization at all keeps warning rather than refusing | same file, the existing "localization is disabled" case | **passes now** — stays-true; a host may register the plugin before adding locales |
| AC3b | R8 | A target list the host wrote empty is left alone, because it is a valid way to keep auto-translate off | same file, a new case asserting no throw | **passes now** — stays-true, and added after a review found the first implementation broke it |
| AC4 | R2 | A managed collection with `localizeStatus` **and** the experimental flag both set refuses, naming the collection and what is unsupported | a new unit case over `translatorPlugin` beside `plugin.test.ts` | **fails now** — the name is absent from the plugin's code |
| AC5 | R2 | `localizeStatus` set **without** the experimental flag does not refuse, because Payload itself disables it | same file, the control case | **passes now** — stays-true, and vacuously so before the change; a mutation proves it discriminates after |
| AC6 | R2 | An unmanaged collection carrying `localizeStatus` does not refuse | same file | **passes now** — same, with its own mutation |
| AC7 | R1 | `refuseAnUnusableConfig` and `refuseDuplicateNames` throw `TranslatorConfigError` | `plugin.test.ts`, asserting the class rather than the message | **fails now** — both throw bare `Error` |
| AC8 | — | The baselines hold | `bunx turbo run check-types` 10/10 · `bunx oxlint .` 26 warnings 0 errors from the package directory | **passes now** — measured |
| AC9 | — | The suites hold | package `bunx vitest run` ≥ 3049 passed, 15 skipped · integration ≥ 290 passed, 7 skipped | **passes now at 3049 / 290 + 7** |

AC5 is the criterion that catches the mistake this task is most likely to make: refusing a host
whose setting Payload is about to turn off. AC3, AC3b and AC6 guard the other permissive edges, so
that "refuse" does not quietly widen into configurations nobody asked us to judge. Three of those
four pass against the untouched tree, so each is proved to discriminate by a mutation rather than
by its pre-flight.

## Risk

**Medium.** No stored shape changes and no data is touched, so rollback is a revert. The exposure is
that a refusal is a hard failure: a predicate wrong in the permissive direction leaves today's
silence in place, and one wrong in the strict direction stops a host booting over a configuration
that was fine. AC5, AC6 and AC3 exist for the strict direction, which is the one a host cannot
recover from mid-deploy.

No application in this repository sets `localizeStatus`, so nothing here is expected to go red for
that reason; a host outside it that did would now be refused, which is the intended breaking change.

## Decisions by the owner

- 2026-11-23 — the work is cut to the configuration layer, because a major release is close and the
  remaining two layers cover only a world introduced by another plugin after this one has read it.
  The gap is recorded rather than closed, and widening to it later needs no rework.
- 2026-11-23 — the save-path outcome type and the admin panel field are deferred past the major:
  they are the expensive half of refusals and the editor loses neither text nor money without them.
- 2026-11-23 — the analyzer zone that both build step 1 and build step 5 called for is dropped and
  is not to be raised again; it is recorded as an accepted deviation in the design it came from.
