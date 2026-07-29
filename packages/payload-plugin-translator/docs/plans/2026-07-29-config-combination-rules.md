# Translator plugin — config combination rules & enforcement plan

**Status:** Spec + implementation plan (Phase 2 design) · **Date:** 2026-07-29 · **Scope:** `@focus-reactive/payload-plugin-translator`
**Companion:** builds on `2026-07-24-feature-dependency-graph.md` (the dependency edges); this doc is about **combination behavior** and **how to anchor each rule in code**. Every row is evidence-backed by a read-only combination sweep (config×config, config×per-collection, feature×runner/drafts/localization).

Goal: turn the plugin's implicit combination behavior into **explicit, mostly-enforced contracts**, so an invalid or silently-degrading configuration is caught (or at least surfaced) instead of "working weirdly." The root problem the sweep found: enforcement is **asymmetric** — the auto-translate config path is well-guarded (config-time warns), while the manual-enqueue path, the runner choice, and cross-route consistency are guarded only by prose/JSDoc.

## How to read this

**Tiers** (where a rule can be anchored):
- **A — type** (compile-time): make the invalid combination *unrepresentable* in the plugin's own config types. Strongest, but only reaches the plugin's own config shape — NOT Payload's `localization`, per-collection `custom`, or the runner instance.
- **B — init validation** (boot-time): each capability declares `requires`/`conflictsWith`/`warnsWhen`; a central `validateComposition()` throws/warns at `init()` and logs the resolved "effective config". The workhorse — most rules land here.
- **C — runtime contract** (per-op): a shared code unit every path must call (locale resolution, exclude check), or a per-operation policy (cap). Fixes drift + the real bugs.
- **advisory** — a behavioral/perf property that is not an error and cannot be a hard contract; surfaced via warn + doc + (where useful) the admin UI.

**Enforcement kinds:** `type` · `throw` · `warn` · `guard` (shared runtime unit) · `cap` · `doc/observe`.

**Default throw-vs-warn stance:** warn by default; `throw` only for unambiguously-broken configs; every `throw` gets a documented escape hatch. (Open thresholds flagged in §4.)

---

## 1. Real defects — fix regardless of the rest (Tier C)

| # | Rule | Current behavior (evidence) | Contract | Tier | Enforce | Anchor |
|---|---|---|---|---|---|---|
| D1 | `withFieldTranslation({ exclude:true })` must be honored by **every** translation path, including the `/field` route | Whole-doc/auto/collection honor it via `FieldChunkCollector`→`isTranslatableLeaf`; the fieldLevel `/field` route gates only by type (`field-guards.ts:11-13`) and never checks exclude (`resolveFieldSubtree.ts:54-62`, `translate-field/handler.ts:104-124`) → an excluded field **can be translated** by naming its path | C | guard (honor exclude in `resolveFieldSubtree`/handler) | `translate-field/resolveFieldSubtree.ts`, `translate-field/handler.ts` |
| D2 | A target locale not in `config.localization` must never reach the pipeline — on **all** enqueue paths | Auto-translate path guarded; **manual `/enqueue` is not**: `resolveTargetLocales` with `knownLocales=null` (localization off/absent) keeps all targets → `payload.update({locale})` writes a phantom locale (orphan rows on Mongo/SQLite; enum error on Postgres) (`resolveTargetLocales.ts:37-38`, `enqueue/handler.ts:47-49`) | C | guard (shared locale-resolution unit both paths call; when localization absent → drop+warn or 400) | new shared `resolveTargetLocales` used by auto-translate + enqueue |

D1/D2 also collapse the duplicated invariants I5/I6/I7 (source-exclusion / unknown-drop / dedup live in 2–3 copies today) into one shared unit — one fix, three benefits.

## 2. Silent degradation — feature looks enabled, no-ops with no signal

| # | Rule | Current | Contract | Tier | Enforce | Anchor |
|---|---|---|---|---|---|---|
| S1 | Stale detection requires provenance enabled | `/stale/*` always registers; returns `[]` when `serviceFactory` absent, no signal (`getDocumentStaleness.handler.ts:30-31`) | **Preferred A:** model stale as an explicit sub-option of `provenance` so "stale without provenance" can't be expressed. **Fallback B:** warn at init if a stale surface is active without provenance | A→B | type (preferred) / warn | `plugin.ts` config type; `Provenance.wiring.ts` |
| S2 | Empty `levels: []` = no UI **and** no HTTP surface | `??` keeps `[]`; modifiers/provenance/auto-translate still wire, but nothing to translate through, no signal (`plugin.ts:148`) | warn: "no levels → no translation UI or endpoints registered" | B | warn | `plugin.ts` levels resolution |
| S3 | `withAutoTranslate` on a collection not in `collections` is ignored | `slugs = enabled ∩ managed` → hook never injected, silent (`AutoTranslate.wiring.ts:76`). Inconsistent with manual enqueue, which 400s for unmanaged | warn: "auto-translate configured on <slug> but it is not in the plugin's `collections`" | B | warn | `AutoTranslate.wiring.ts` |
| S4 | Auto-translate with no *effective* targets (`[]`, or only the source locale) | 0 tasks, silent (only the unknown-locale drop warns) (`policy.ts:136-137`, `hook.ts:80`) | warn: "auto-translate on <slug> has no effective target locales" | B | warn | `AutoTranslate.wiring.ts` |
| S5 | Provenance on a SQL adapter requires the migrated table to exist | Runtime **swallows** a missing table (returns `[]`, writes no-op) → history silently never recorded; no signal (`plugin.ts:59-67`) | **RESOLVED — probe + throw:** at init, when adapter is SQL + provenance enabled, do a lightweight existence probe on the provenance table; if absent, stop init with a controlled error naming the fix ("generate + run a migration for `<slug>`"). Also **stop swallowing** the missing-table error at runtime (defense-in-depth). Probe = one init query; fires **only when the table is genuinely absent** (silent once migrated) | B | **throw** (probe-gated) | provenance wiring / `init()` |
| S6 | `targetSelection:'multi'` has no effect without a document/collection level | With only `fieldLevel`/`[]`, multi is inert, silent (`fieldLevel` never reads it) | warn: "targetSelection has no effect without documentLevel/collectionLevel" | B | warn | `plugin.ts` / builder |
| S7 | Duplicate slug in `collections` silently collapses (Map last-wins) | `schemaMap` keyed by slug (`plugin.ts:128-130`) | **RESOLVED — throw:** a duplicate slug stops init with a clear error (silently collapsing hides a real config mistake, and there's no non-arbitrary winner to pick for the user) | B | **throw** | `plugin.ts` schemaMap build |

## 3. Contradictory / undefined — no defined rule

| # | Rule | Current | Contract | Tier | Enforce | Anchor |
|---|---|---|---|---|---|---|
| X1 | A level may appear at most once | Endpoints dedup by `method+path`; **admin components do NOT** → duplicated control (`PluginConfigBuilder.ts:139-141`; I13) | **RESOLVED — silent dedup:** dedup admin components by (slot + component identity) in the builder → a doubled level renders one control; no warn (single obviously-correct resolution) | C | guard (dedup) | `PluginConfigBuilder.ts` |
| X2 | Provenance sidecar slug must not collide even via SQL `dbName`/snake_case | Exact-slug throws; `dbName`/case/separator variants unguarded (`slugGuard.ts:5-13`) | **RESOLVED — throw:** normalize (snake_case + `dbName`) and compare; a probable table collision stops init with a clear error (extends the existing exact-slug throw; best-effort — a normalized match is treated as a collision) | B | **throw** | `slugGuard.ts` |
| X3 | Translation endpoints default to **authenticated** (`req.user` present), not open | Today all routes are open when `access` is unset (`withAccessCheck.ts:14`) — a spend/DoS footgun with no signal | **RESOLVED — safe default + warn-on-open:** default `access` = require an authenticated user; override stricter (roles/tenants) or looser (allow-all) via `access`. Print the resolved policy in the effective-config log. **Warn only when `access` is explicitly allow-all.** Behavior change → release note + `@since`; keep an explicit allow-all escape hatch for local dev / externally-authed callers | A+B | **default guard** + warn-on-explicit-open | `init()` / routes wiring; `access` config default |

## 4. Implicit behavior — same config, different runtime

| # | Rule | Current | Contract | Tier | Enforce | Anchor |
|---|---|---|---|---|---|---|
| M1 | `multi × select_all` fan-out is bounded | Unbounded `docs × targets` cross-product, no cap/confirm (`enqueue/handler.ts:67-83`, `collection-utils.ts:20-25`) | **RESOLVED:** new plugin config `maxBulkTasks?: number` (default **500**); a bulk run over the limit is rejected (400) with a clear message (`docs×targets` count + limit + "raise `maxBulkTasks` to allow more") | C | cap (+ config prop) | `enqueue/handler.ts`; config type |
| M2 | Features that need durable cross-request status must be unavailable on a runner that can't provide it | Sync runner runs inline in afterChange; status in-memory, lost on restart; only JSDoc says "development" (`SyncRunnerProvider.ts:48-62`). Status/progress/cancel endpoints silently return stale/empty in-memory data | **RESOLVED — capability contract, NOT env-gating:** extend the runner port with a declared capability set (e.g. `durableStatus`, `async`); the core decides by **declared capability, never by concrete runner type** (no `instanceof`). Endpoints/UI that require `durableStatus` either don't register or return a clear "unsupported by the configured runner" response instead of degrading silently. Print `runner=sync: inline, non-durable, status endpoints off` in the effective-config log. No `NODE_ENV` check. **Pre-req:** enumerate (from code) exactly which surfaces require durable status | A+C | **capability guard** on the runner port | runner port `interface` + status/progress/cancel wiring |
| M3 | Auto-translate trigger semantics (drafts on = publish-gated; off = every save) | Correct but only a README parenthetical; not surfaced (`policy.ts:100-103`) | advisory: state in effective-config log + the admin auto-translate indicator; doc | advisory | doc/observe | effective-config log + `AutoTranslateMarker` |
| M4 | Auto-translate source = `defaultLocale` unless overridden | Changing `defaultLocale` silently re-points the source (`hook.ts:52-53`); manual path uses request `source_lng` | advisory: show resolved source per collection in effective-config log; doc | advisory | doc/observe | effective-config log |
| M5 | Source fingerprint read omits `fallbackLocale:false` (target read has it) | Edge: only when `sourceLocale ≠ defaultLocale` fallback-filled values enter the baseline (`sourceDocument.ts:15` vs `handler.ts:57`) | small code fix (add `fallbackLocale:false` to the source read) OR document the constraint | C | guard (or doc) | `shared/payload/sourceDocument.ts` |

## 5. The mechanism (Tier B core) — capability contracts + one validator

Each capability module exports a lightweight contract descriptor (no DI container):

```ts
type CapabilityContract = {
  id: string;                               // "provenance" | "auto-translate" | "levels" | ...
  enabledBy: (cfg) => boolean;              // is this capability active for this config?
  requires?: string[];                      // hard prerequisites (other capability ids / conditions)
  conflictsWith?: string[];                 // hard conflicts
  warnsWhen?: (resolved) => Diagnostic[];   // soft/degradation checks → warnings
  effective?: (resolved) => string[];       // lines for the "effective config" log
};
```

`init()` gathers the contracts and runs one pass:
```ts
const { errors, warnings, effective } = validateComposition(contracts, resolvedConfig, { adapter, env });
if (errors.length) throw new TranslatorConfigError(errors);   // hard (Tier B throw)
for (const w of warnings) payload.logger.warn(w);             // soft (Tier B warn)
payload.logger.info(renderEffectiveConfig(effective));        // observability (answers "implicit config")
```

- **`errors`** = the `throw` rows (unambiguously broken).
- **`warnings`** = the silent-degradation + implicit rows.
- **`effective`** = the resolved-behavior log — the single biggest win for "implicit configuration": every active capability prints what it actually does (auto-translate: publish-gated on `posts` into `de,fr`; runner=sync→inline; provenance=on slug `translator-provenance`; …).

Type-level (Tier A) items (S1 stale-as-subflag, and any config-shape tightening) are done in the config types directly; runtime (Tier C) items (D1, D2, X1, M1, M5) are shared units / builder changes, independent of the validator.

## 6. Sequencing (each row already tags where it goes)
1. **Tier C bug fixes first** — D1, D2 (+ fold I5/I6/I7 into the shared locale unit), X1 (component dedup). Highest value, independent, shippable now; each is a real correctness fix.
2. **Tier A** — S1 stale-as-subflag (unrepresentable-invalid) + any config-shape tightening.
3. **Tier B core** — the `CapabilityContract` + `validateComposition` + effective-config log, then wire the warn/throw rows (S2–S7, X2, X3). S5 adds the init-time provenance-table probe; S7/X2 are throws.
4. **Runner capability contract (M2)** — extend the runner port with declared capabilities; gate durable-status-dependent surfaces on them. Independent of the validator; needs the affected-surface enumeration first.
5. **Tier C policy** — M1 `maxBulkTasks` cap.
6. **advisory** — M3, M4 surfacing + docs.

## 7. Threshold decisions

All threshold decisions are resolved (2026-07-29):
- **X3 access:** safe default — require an authenticated user; override both ways via `access`; warn only on explicit allow-all. (Not "warn on open by default" — the default is now safe.)
- **M1 bulk cap:** configurable `maxBulkTasks`, default **500**; over the limit → reject (400) with the count.
- **X1 duplicate level:** silent dedup of admin components (single obviously-correct resolution).
- **S7 duplicate slug / X2 slug collision:** throw at init — a name collision has no non-arbitrary winner, so the developer must resolve it.
- **S5 SQL migration:** probe the provenance table at init; **throw** a controlled error if absent (silent once migrated) — not a recurring warn. A missing table is a broken config, not a nag.
- **M2 sync runner:** **not** env-gated. Model runner **capabilities** on the port; make durable-status-dependent features unavailable by declared capability (never by runner type). Enumerate the affected surfaces from code before implementing.

Everything above is design; no code in this doc. Tier C bug fixes (D1/D2/X1) are the natural first implementation slice.
```
