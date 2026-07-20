# Design — "auto-translate enabled" indicator inside the translation popups (#51 follow-up)

**Date:** 2026-07-17
**Status:** designed; implementation pending approval.
**Depends on:** #51 auto-translate (`withAutoTranslate`, on the same unreleased `0.9.0` branch).
**Kind:** internal UI addition, **no public API change** → ships in the same `0.9.0` as `withAutoTranslate`.

---

## The ask (ground truth)

When a collection is opted into auto-translate (`withAutoTranslate`), the editor should be able to
**see that it's on** — a static marker (icon + tooltip with a short description), not a progress
indicator. It must appear **inside the translation popup in both places the popup opens**:

- the **document** popup (`beforeDocumentControls` → `TranslateDocument`), and
- the **collection / bulk** popup (`beforeListTable` → `BulkTranslationDashboard`).

Out of scope: a list-view chip, a sidebar-nav marker, any document-level toggle (that is the future
manager layer, #51 D7).

## How it lands on the system

Both popups already share the same shape (`title → section "Translate" → section "Status"`):
- doc: `src/client/widgets/translate-document/ui/TranslateDocument.tsx:79-107`
- bulk: `src/client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.tsx:78-102`

Both are fed by a server boundary that already reads the collection config:
- `TranslateDocument.server.tsx:23` — has `props.collection` (a `CollectionConfig`), passes `hasDrafts` down.
- `BulkTranslationDashboard.server.tsx:22` — reads `props.payload.collections[slug]?.config`, passes `hasDrafts` down.

So the shape is: **server boundary resolves the auto-translate config for the collection → passes it
as a prop → the client popup renders one shared badge, shown only when enabled.**

Reuse points:
- Tooltip: `src/client/shared/ui/Tooltip/Tooltip.tsx` (`@radix-ui/react-tooltip`, already a dep).
- Icon: `src/client/shared/lib/assets/icons/LanguageTranslateIcon.tsx` (inline SVG, `currentColor`).
- Icon+tooltip pattern to copy: `src/client/widgets/translate-field-control/ui/TranslateFieldControl.tsx:134-146`.
- Config reader: `getAutoTranslateConfig(collection)` (`src/core/auto-translate-config/getAutoTranslateConfig.ts`), reads `collection.custom[AUTO_TRANSLATE_CUSTOM_KEY]`.

## The correctness trap (why this needs a design, not a one-liner)

`withAutoTranslate` stamps the opt-in onto `collection.custom` of the object passed to the **plugin's
`collections` param**. The **registered** collection (top-level `buildConfig.collections`) can be a
**different, unwrapped** object — the dev config proves it: `apps/dev/src/payload.config.ts` lists an
unwrapped `Articles` at the top level and the wrapped one only inside `translatorPlugin({ collections })`.

Both popup server boundaries read the **registered** collection at runtime. So a naive
`getAutoTranslateConfig(props.collection)` returns `null` there even though auto-translate is on — the
icon would silently disagree with the actual behaviour. The indicator must derive "enabled" from the
**same source of truth as the wiring itself**, not from whatever object Payload happened to register.

## The design

**A quiet header marker, two mount points.** One component, rendered by both popups. This is ambient
config the editor rarely needs, so it does not occupy the popup's main vertical flow (title / Translate
/ Status) at all — it's a single muted icon pushed to the **right edge of the title row**, with the
detail in a tooltip. No border, no fill, no extra section (the popup's own sections separate with a plain
divider; a bordered panel fought that language).

- `src/client/entities/translation/ui/AutoTranslateMarker/AutoTranslateMarker.tsx` — `"use client"`,
  props `{ targets: string[]; sourceLocale: string }`. A muted `AutoTranslateIcon` (a lightning bolt —
  "fires automatically", distinct from the manual translate glyph) wrapped in `Tooltip`
  (`@radix-ui/react-tooltip`), `tabIndex={0}` + `aria-label` for keyboard/AT. Tooltip copy states the
  source, the targets (locale codes), and the trigger. Lives under `entities/translation`.
- The popups wrap their `<h4>` title in a `.header` flex row (`space-between`) so the marker sits at the
  right edge without pushing the flow.

**Data reaches the badge via the registered collection's `custom` — made reliable by propagation.**
The auto-translate module's `configure()` ConfigModifier already injects the `afterChange` hook onto
each enabled+managed collection (`AutoTranslate.wiring.ts:44-51`). It will **also stamp the normalized
opt-in onto that same registered collection's `custom[AUTO_TRANSLATE_CUSTOM_KEY]`**, so at runtime both
server boundaries can uniformly call `getAutoTranslateConfig(payload.collections[slug].config)` and get
the truth. Propagation is idempotent (re-stamping the same value is a no-op) and additive (behaviour
wiring still reads from the plugin param, unchanged).

**Placement in the popup:** the marker sits at the right edge of the title row (a `.header` flex row),
rendered only when enabled. Same in both popups so the two surfaces read as one system.

**Locale hygiene (review follow-up):** targets / a `sourceLocale` override that name locales not in
`localization.locales` are dropped at config time with a clear `console.warn` (see D6) — so a mistyped
locale can never reach the pipeline (where it would burn a provider call and either error at the DB or
orphan data) nor show a phantom code in this marker.

## Decisions (ADRs)

- **D1 — one shared component, not two.** Both popups render the same `AutoTranslateMarker`. Identical
  UX, single place to change. Rejected duplicating a marker per popup.
- **D2 — data source = propagate the opt-in onto the registered collection's `custom`** (in the
  auto-translate `ConfigModifier`), then read it at runtime via `getAutoTranslateConfig`. This unifies
  the source for both server boundaries and any future runtime reader. *Alternative considered:* thread
  a `Map<slug, config>` through the `LevelContext` into each component's serverProps — rejected: more
  plumbing (ctx + two levels + two export classes), and it doesn't help the bulk boundary, which reads
  `payload.collections` at runtime rather than at config time.
- **D3 — a quiet header marker, out of the main flow** (revised twice against review). The detail is
  ambient config the editor rarely needs, so it belongs in a tooltip on a muted icon at the right edge
  of the title row — not in the vertical flow. Uses a dedicated `AutoTranslateIcon` (a lightning bolt =
  "automatic"; chosen over the language glyph, which reads as manual translate, and over sync-arrows,
  which read as a manual refresh action — compared as rendered candidates at real 14px size); static, no
  fill/border. *Rejected iteration 1:* an inline icon+label row between title and form (read as an
  unlabelled extra section). *Rejected iteration 2:* a bordered/tinted "Automation" panel (the border +
  fill fought the popup's divider-only section language, and it kept always-on detail in the flow that
  isn't needed there). If a second automation setting appears later, revisit a grouped surface then —
  don't build the container for a single fact now.
- **D4 — internal only, no public API.** No new `src/index.ts` export; `withAutoTranslate` stays the
  only public surface (`@since 0.9.0`). The badge ships inside the same unreleased `0.9.0`. Commit type
  `feat(translator): …` (folds into the pending 0.9.0).
- **D5 — tooltip copy (UX):** state what's on, the source, the targets, and the trigger, concisely —
  e.g. *"Auto-translate is on for this collection. Publishing changes to the source (`en`) content
  automatically queues translations into de · fr · es."* Source/targets come from the config; keep it
  one or two sentences. (No serverless caveat in the tooltip — that lives in `withAutoTranslate` JSDoc/README.)
- **D6 — validate target/source locales at config time = warn + drop** (review follow-up). Unknown
  locales are filtered out of the effective policy in the `ConfigModifier` (which already holds the
  Payload `Config`, so `config.localization` is in scope — no new coupling), with a `console.warn` per
  collection. Chosen over: (a) throwing at init — too harsh, one typo would break `buildConfig`; (b)
  validating in `getAutoTranslateConfig` — that reader is payload-free `core/` and has no locale list;
  (c) leaving it — the silent failure this fixes (burned provider calls, DB enum error on Postgres, or
  orphaned invisible data on Mongo/SQLite). The filter/extract logic is pure (`filterPolicyToKnownLocales`,
  `extractLocaleCodes` over a `Set<string>` / a narrow `LocalizationLike`), unit-tested; the modifier
  only reads `config.localization` and emits the warning.

## Build sequence

1. **Propagation (D2):** in `server/modules/auto-translate/AutoTranslate.wiring.ts` (or its hook-inject
   helper), stamp `custom[AUTO_TRANSLATE_CUSTOM_KEY]` onto each enabled+managed registered collection in
   the `ConfigModifier`. + unit test asserting the registered collection carries the config after init,
   even when only the plugin-param object was wrapped (the dev scenario).
2. **Shared marker:** `entities/translation/ui/AutoTranslateMarker/` (component + styles + barrel). A pure
   `resolveAutoTranslateSummary` helper (`entities/translation/model/autoTranslateSummary.ts`, beside the
   other `derive*` model fns) turns a collection + default locale into `{ targets, sourceLocale } | null`
   — unit-tested (`.test.ts`). No render test: the package has no client test infra (node env, `*.test.ts`
   only), so client UI is covered by type-check + manual. The opt-in reader `getAutoTranslateConfig`
   validates the config shape (`targets` is a `string[]`) so a foreign `custom` key collision returns
   `null` rather than crashing the readers.
3. **Doc popup:** `TranslateDocument.server.tsx` resolves the summary and passes
   `autoTranslate={{ targets, sourceLocale }}` (or `null`); `TranslateDocument.tsx` renders the panel
   under the title when present.
4. **Bulk popup:** same in `BulkTranslationDashboard.server.tsx` + `BulkTranslationDashboard.tsx`.
5. **Verify:** check-types + tests + lint; then manual check in `apps/dev` (Articles/Playground are
   already wrapped) — badge visible in both popups, tooltip lists de/fr/es, source `en`.

## Requirement coverage

| Req | Design element | Status |
|-----|----------------|--------|
| Marker visible when auto-translate is on | `AutoTranslateMarker`, conditional on config | met |
| In the document popup | rendered in `TranslateDocument.tsx` header row | met |
| In the collection popup | rendered in `BulkTranslationDashboard.tsx` header row | met |
| Icon + description | muted `LanguageTranslateIcon` + tooltip copy (D5) | met |
| Marker agrees with real behaviour | D2 propagation → single runtime source | met |
| No public API / version churn | internal only, ships in 0.9.0 | met |

## Open questions

- **Badge label vs. icon-only:** show a short text label next to the icon, or icon-only with everything
  in the tooltip? Leaning icon + short "Auto-translate" label for discoverability; confirm at impl.
- **Targets locale labels:** show locale **codes** (`de`) or Payload locale **labels** (`Deutsch`)?
  Codes are simplest and match the rest of the plugin UI; revisit if labels are wanted.
