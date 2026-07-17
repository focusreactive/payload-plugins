# Design — auto-translate on source content change (#51)

**Date:** 2026-07-15
**Status:** designed (forward architecture, multi-candidate + adjudicated); implementation pending approval.
**Method:** system map → 3 candidate designs (max-reuse · min-new-abstraction · cleanest-boundaries) → adjudication against the invariant checklist. Spine = cleanest-boundaries, with `withAutoTranslate` grafted from max-reuse.
**Kind:** feature (opt-in) → `feat:` (minor).
**Depends on:** #47 provenance (landed) · #50 stale detection (landed). Builds on the `configure()` seam reserved by the reshape (`2026-07-14-translate-collection-plugin-reshape.md`, D4).

---

## The ask (ground truth)

An **opt-in** mode that automatically queues translations for configured target locales when a
document's **source-locale** content changes. Off by default. Configured by the **developer, in code**
(v1); a future phase adds a manager-facing document-level toggle.

In-scope requirements (each maps to a design element below): **R1** opt-in per-collection config
(targets, strategy, debounce), off by default · **R2** source-locale change enqueues configured targets ·
**R3** drift-gate skips unchanged content · **R4** no infinite loops · **R5** serverless-cost aware
(debounce + drift) · **R6** best-effort (never fails the editor's save) · **R7** the public interface must
warn that the feature depends on a working job runner / autorun (Vercel/serverless caveat) · **R8** lay a
foundation for the future document-level manager layer **without** building UI/storage/permissions now.

NFRs: consistency = best-effort; permissions = none in v1; migration = none (no schema); API = additive
to `src/index.ts`, `@since` minor; performance = R5.

## How it lands on the system

One new module + one `configure()` entry in `plugin.ts` — the seam the reshape reserved. Reuse points:
- **Config-time module + hook injection:** mirror `src/server/modules/provenance/` — `Provenance.wiring.ts`
  (`configure(managedSlugs) → ConfigModifier`), `ProvenanceCleanup.hook.ts` (marker idempotency), `Provenance.shapes.ts` (narrow config slice).
- **Per-collection config via `custom`:** the field level already does exactly this — `withFieldTranslation`
  (`src/field-config.ts`) + `getFieldTranslationConfig` (`src/core/field-config/getFieldConfig.ts`) with a typed
  `custom` key. `collection.custom` survives the `schemaMap` clone (`plugin.ts` clones only `.fields`).
- **Enqueue:** `wireTranslateRunner.ts` builds the request-scoped `TaskRunnerFactory`; `enqueue(TaskInput[])`;
  `PayloadJobsTaskRunner.enqueue` already supersedes the prior pending job per `(collectionId, targetLng)`.
- **Drift:** `src/core/content-projection/computeSourceFingerprint.ts`; predicate style sibling `src/core/provenance/staleness.ts` `isRecordStale`.
- **Pipeline reuse:** auto-enqueued jobs run through the existing `TranslateDocumentHandler` (provenance recording unchanged).

## The design

**Abstractions** (responsibility · invariant · callers):
- `withAutoTranslate(collection, opts)` — public config writer; stamps `collection.custom[AUTO_TRANSLATE_CUSTOM_KEY]`, returns a new object (no mutation), exactly like `withFieldTranslation`. Callers = each opted-in user collection (the opt-in mechanism itself).
- `getAutoTranslateConfig(collection)` — payload-free reader over the `custom` slice (sibling of `getFieldTranslationConfig`).
- `hasSourceContentChanged(prevDoc, nextDoc, schema)` — pure payload-free predicate = `computeSourceFingerprint(prev) !== computeSourceFingerprint(next)`; create (no prev) = changed. Extraction justified by the `isRecordStale` testability norm; 2nd caller = the future R8 catch-up check.
- `AutoTranslatePolicyResolver: (collectionSlug, doc) => NormalizedAutoTranslatePolicy | null` — the R8 seam; v1 impl reads collection config and **ignores `doc`**; `null` = off. Module-internal (not a plugin-injected dependency, to avoid a zero-caller seam). 2nd impl = the future document-level manager.
- `configureAutoTranslate(...) → { configure(managedSlugs) → ConfigModifier }` — config-time wiring, mirrors `configureProvenance`.
- Thin **hook** (`AutoTranslateEnqueue.hook.ts`, best-effort, orchestration only) + pure **policy** (`AutoTranslate.policy.ts`: normalization, `TaskInput` assembly, `waitUntil` math).

**Dependency direction** (all downward, acyclic — verified by the adjudicator):
`plugin.ts → server/modules/auto-translate/* → { core/auto-translate (predicate), core/auto-translate-config (reader), server/modules/task-runner (TaskInput/factory types), types/ (ConfigModifier, loop-guard key) }`; `core/auto-translate → core/content-projection`; `src/auto-translate-config.ts` (public `withAutoTranslate`) → `core/auto-translate-config`; `server/features/translate-document/handler → types/` (loop-guard key only — **no** import of the auto-translate module). task-runner is a shared infra kernel (sideways-but-acyclic, like `PluginConfigBuilder → task-runner`).

**Placement:**
- `src/core/auto-translate/hasSourceContentChanged.ts` (+ test) — payload-free.
- `src/core/auto-translate-config/` — types + `AUTO_TRANSLATE_CUSTOM_KEY` + `getAutoTranslateConfig` (payload-free).
- `src/auto-translate-config.ts` — `withAutoTranslate` (top-level, imports Payload `Field` type like `field-config.ts`), exported from `src/index.ts`.
- `src/types/` — the loop-guard `req.context` key constant (leaf, mirrors `ConfigModifier` placement → kills the `features → module` cycle).
- `src/server/modules/auto-translate/` — `AutoTranslate.shapes.ts` · `AutoTranslate.policy.ts` · `AutoTranslateEnqueue.hook.ts` · `AutoTranslate.wiring.ts` · `index.ts`.
- `src/server/modules/task-runner/types.ts` (`TaskInput.waitUntil?`) + `PayloadJobsTaskRunner.ts` (passthrough).
- `src/plugin.ts` — one `configureAutoTranslate(...)` call after `wireTranslateRunner`, one `builder.addConfigModifier(...)`.

**Data flow & ownership (one source of truth each):** per-collection config → `collection.custom[key]` · source locale → `policy.sourceLocale ?? config.localization.defaultLocale` · loop-guard → transient `req.context` flag · debounce → the pending job's `waitUntil` (owned by payload-jobs) · drift baseline → computed on the fly from prev/next, never stored.

## Requirement coverage

| Req | Design element | Status |
|-----|----------------|--------|
| R1 | `withAutoTranslate` stamps `custom`; absent = off | met |
| R2 | `AutoTranslateEnqueue.hook` (afterChange) → policy → `taskRunnerFactory.enqueue` | met |
| R3 | `hasSourceContentChanged` top-of-hook | met |
| R4 | source-locale check + `req.context` skip-flag | met |
| R5 | `waitUntil` debounce + drift-gate | met |
| R6 | hook in try/catch, log-only, marker idempotency | met |
| R7 | JSDoc on `withAutoTranslate` + README, point at existing run route | met |
| R8 | `AutoTranslatePolicyResolver(slug, doc)`, `doc` ignored in v1 | met (foundation) |

## Decisions (ADRs)

- **D0 — who configures = phased hybrid.** v1 developer/code-level; future manager-facing document-level toggle bolts on via D7 without reworking the base. No UI/storage/permissions in v1.
- **D1 — config surface = `withAutoTranslate(collection, opts)`** (not a plugin-level map). Single source of truth on the collection; config travels with it; the field-level precedent exists. The cleanest-boundaries objection (that user-space + plugin both claim `hooks.afterChange`) was **verified as a misread** — the helper writes only `custom`; hook injection stays in `configure()`.
- **D2 — module shape = full split** under `server/modules/auto-translate/` (shapes · policy · hook · wiring · index), own narrow `.shapes.ts` (no relocating provenance's shape). Thin best-effort hook + pure testable policy.
- **D3 — drift-gate = extract** `core/auto-translate/hasSourceContentChanged` (not inline), per the `isRecordStale` testability norm; reusable by R8.
- **D4 — debounce = `waitUntil` + existing supersession.** Add optional `waitUntil?: Date` to `TaskInput`, pass through in `PayloadJobsTaskRunner.enqueue`; `waitUntil` computed in the pure policy. A fresh edit cancels+replaces the pending delayed job → real debounce. (`waitUntil` confirmed supported in Payload 3.84.1.)
- **D5 — loop-guard = source-locale check + `req.context` flag** (both). Source = `policy.sourceLocale ?? config.localization.defaultLocale` (zero-config default, optional per-collection override; rejected a mandatory per-collection `sourceLng` as a 2nd source of truth). Flag key lives in `types/`.
- **D6 — Vercel/job-runner = documentation only.** JSDoc on `withAutoTranslate` + a README "Serverless / Vercel" note pointing at the existing manual run route. No runtime detection.
- **D7 — foundation = `AutoTranslatePolicyResolver(slug, doc) → policy | null`**, `doc` ignored in v1, kept module-internal. The future manager supplies a 2nd impl; hook/drift/debounce/wiring untouched; `null` already means off.
- **D8 — trigger = publish-only** *(product decision)*. Auto-translate fires only when the source is published (`_status === "published"`); autosave/draft saves are ignored. Collections without drafts: every save counts (no `_status`). Keeps cost down and avoids autosave storms.
- **D9 — auto-translated target status = mirror the source** *(product decision)*. The auto path sets `publishOnTranslation` from the source doc's status: published source → published translation. Combined with D8, the source is always published when we fire, so translations publish; consistent for no-drafts collections too. (Overridable later via a per-collection opt.)

## Build sequence (all incremental; off by default, additive, no migration)

1. `core/auto-translate/hasSourceContentChanged.ts` + test (D3) — the drift contract.
2. `core/auto-translate-config/` (types + key + reader) and `src/auto-translate-config.ts` (`withAutoTranslate`), export from `src/index.ts` (D1) — the config source of truth.
3. `src/types/` loop-guard context-key constant (D5).
4. `TaskInput.waitUntil?` + `PayloadJobsTaskRunner.enqueue` passthrough (D4) — **needs regression coverage on the manual enqueue path** (additive-optional; no migration).
5. `TranslateDocumentHandler.saveTranslatedDocument` sets the loop-guard `context` flag on its `payload.update` (D5).
6. `server/modules/auto-translate/` (shapes · policy[resolver + task assembly + `waitUntil` + D8 publish-gate + D9 status] · enqueue hook · wiring · index) (D2/D5/D7/D8/D9) — the feature body.
7. `plugin.ts` — `configureAutoTranslate(...)` after `wireTranslateRunner`, register via `addConfigModifier`; resolve `localization.defaultLocale` in the modifier.
8. Docs — JSDoc (R7 Vercel warning) on `withAutoTranslate`, README `Since vX.Y.Z`, reference the existing run route.

## Open questions

- **Create vs update:** creating an already-published source doc → enqueue? Default yes (fires on any `afterChange` that passes the D8 publish-gate). Confirm at impl.
- **`SyncTaskRunner` ignores `waitUntil`** — in dev, debounce is a no-op (immediate translation on each qualifying save). Intended (sync runner = dev); noted.
- **R7 execution reality (accepted limitation):** on serverless without a running autorun/external trigger, enqueued jobs may sit unexecuted. Not code-resolvable — surfaced via D6 only.

## Public-interface requirement (R7) — verbatim intent

`withAutoTranslate`'s JSDoc and the README must state clearly: auto-translate only *enqueues*; execution
depends on the job runner's autorun (or an external trigger). On serverless platforms like **Vercel**,
cron-based autorun may not run, so enqueued translations can remain unexecuted until triggered (e.g. an
external cron hitting the existing run-translation route, or a self-hosted worker). This is a
documentation contract, not runtime behaviour.
