# Slice 7 — create `@repo/translator-core` + move the agnostic surface — design

**Date:** 2026-06-30
**Status:** Scope decided (2026-06-30) — **Option C**: consolidate the agnostic surface into an
internal `src/core/` boundary now; the separate `@repo/translator-core` npm package is deferred.
**Part of:** the `@repo/translator-core` extraction (issue #59, branch `feat/translator-core`).
Capstone slice 7 of `docs/plans/2026-06-26-translator-core-extraction-design.md`.

---

## Scope decision (2026-06-30) — Option C (internal `src/core/`), package deferred

A separate private `@repo/translator-core` package **cannot** be the runtime dependency of the
**published** plugin: `@focus-reactive/payload-plugin-translator` is published to npm and built with
`swc` (per-file transpile, no bundling), so a `workspace:*` dep on a private, unpublished package
would leave an unresolvable `import … from "@repo/translator-core"` in the published `dist` (npm 404
for consumers; broken release on merge). Bundling the core into the plugin's `dist` (option B) is
rejected because the plugin exposes **per-file client component paths** (`exports["./client/*"] →
dist/client/*.js`) that Payload's importMap references — bundling would break those.

**Decision (user, 2026-06-30): Option C.** Consolidate the agnostic surface under `src/core/` inside
the plugin, keep the payload-free lint boundary, and do the two decouplings below. This delivers the
architecture + enforcement without breaking publication. The real separate package (Option A —
publish `@repo/translator-core`) is a later step, and by then it is a near-trivial `mv src/core →
packages/translator-core`. So the sections below that describe "the package" now read as **"the
`src/core/` directory"**; the package/publish specifics are deferred to Option A.

## Goal

Create the private workspace package **`@repo/translator-core`** and physically move the
framework-agnostic surface into it. The plugin becomes a thin Payload **adapter** that depends on
the core and re-exports its public bits so the published `@focus-reactive/payload-plugin-translator`
API stays identical. Enforcement becomes real: the core package has **no `payload`/`@payloadcms`
dependency at all**, so a framework import fails to resolve — the strongest possible boundary.

## Current state (after slices 1–6)

The agnostic surface is already payload-free at runtime and mostly at type level. The ONLY residual
coupling is **type-only `Field`** plus one mixed module:

- **Fully clean** (no payload import): `shared/content-projection/**`, `shared/field-traversal/**`,
  `shared/lexical/**`, `shared/field-config/**`, `modules/translation-providers/**`,
  `shared/utils/{isObject,isEmpty}`.
- **Type-only `Field`** (needs `FieldLike` retype): `modules/translation-pipeline/` —
  `translateContent.ts`, `types/PipelineContext.ts`, `types/Pipeline.ts`,
  `stages/field-collector/FieldChunkCollector.ts`, `stages/data-reconciler/DataReconciler.ts`.
- **Mixed module** `shared/guards/field-guards.ts` — three payload-free predicates the core needs
  (`isTabsField`, `isBlockItem`, `hasFields` — all consumed by `field-traversal/kernel`), and three
  payload-typed ones the adapter keeps (`TranslatableField`, `isTranslatableField` → returns a
  payload union, `isRelationshipField`). `shared/guards/collection-guards.ts` is adapter-only
  (`CollectionConfig`; used by client widgets).
- **Dead:** `shared/utils/filterLocalizedFields.ts` (imports `Field`) is only re-exported, never
  called — do NOT move it; leave it (or delete separately).
- Core uses **no zod**. The OpenAI provider uses `openai` (already an `optionalDependency`).

So the extraction is now mostly *mechanical file movement* plus two small decouplings.

## Move-set (the dependency closure → `@repo/translator-core`)

- `content-projection/**` (idPath, contentProjector, translatableLeaf, fingerprinter)
- `field-traversal/**` (kernel, walkFields, findFieldByPath, types, predicates)
- `lexical/**` (Serialized* types, collectTextNodes, traverse, guards, isEmptyRichText)
- `field-config/**` (getFieldConfig, types — the `field.custom` accessors)
- `utils/{isObject,isEmpty}` (+ any other pure utils in the closure)
- the three payload-free guard predicates (`isTabsField`, `isBlockItem`, `hasFields`)
- `modules/translation-pipeline/**` (after the `FieldLike` retype)
- `modules/translation-providers/**` (`TranslationProvider` port + OpenAI impl)

**Stays in the plugin (adapter):** `features/**`, `modules/task-runner/**`,
`modules/translation-levels/**`, `composition/**`, `client/**`, `plugin.ts`, `shared/http/**`
(payload `APIError`), `shared/access/**`, `shared/validation/**`, `collection-guards`, the
payload-typed guards, `types/**` (CollectionSchemaMap, wire contracts, PayloadComponentExport),
`field-config.ts`/`field-actions.ts` (Payload field wiring).

## Decoupling tasks (do IN-PLUGIN first, stays green, before the physical move)

1. **`Field` → `FieldLike` retype** across the 5 pipeline files. `FieldLike[]` already accepts a
   Payload `Field[]` (conformance from slice 1), so the adapter keeps passing real configs unchanged;
   this just removes the last `payload` type import from the pipeline.
2. **Split `field-guards`.** Move `isTabsField` / `isBlockItem` / `hasFields` into `field-traversal`
   (they are traversal predicates over `FieldLike`, used only by `kernel`) so `field-traversal`
   becomes self-contained. Leave `TranslatableField` / `isTranslatableField` / `isRelationshipField`
   in the adapter's `field-guards` (payload-typed; used by `resolveFieldSubtree`). Update `kernel`'s
   import to the new home.
3. **Leave `filterLocalizedFields`** (dead) in the adapter; do not drag it into core.

After 1–2, the entire move-set is payload-free at both runtime AND type level.

## The package

- Location `packages/translator-core`, name **`@repo/translator-core`**, `private: true`,
  `publishConfig.access: public` (publish decision deferred — stays private until a consumer outside
  this repo appears).
- **Toolchain mirrors the plugin** (`payload-plugin-translator/package.json`): `swc` build
  (`build:swc`), `tsc/tsgo` declaration emit (`build:types`), `vitest`, `ultracite`, `copyfiles` if
  any non-TS assets (none expected). Turbo auto-discovers it.
- **Dependencies:** none framework. `optionalDependencies: { openai }` (for the OpenAI provider).
  **No** `payload`, `@payloadcms/*`, `next`, `react`, `zod`. Node built-ins (`node:crypto`) are fine.
- **Exports:** main entry for the pure API (`TranslationProvider`, `projectTranslatableContent`,
  `fingerprint`, `IdPath`/`makeIdPath`, `FieldLike`, the pipeline, field-traversal, lexical). Consider
  a `./providers` subpath so the `openai`-dependent provider is opt-in and the core stays truly
  dependency-free for consumers that bring their own provider. (Open question.)

## Plugin becomes the adapter

- Add `"@repo/translator-core": "workspace:*"` to the plugin deps.
- **Re-export the public API** from core to keep the published surface byte-for-byte:
  `src/index.ts` currently exports `createOpenAIProvider`, `TranslationProvider`,
  `TranslationInput/Output`, `OpenAIProviderConfig`, `DryRunConfig` (from translation-providers) —
  these now come from `@repo/translator-core` and are re-exported. Snapshot `src/index.ts`'s export
  list before/after to prove no drift.
- The adapter passes Payload `Field`/`CollectionConfig` straight into core functions (structurally a
  `FieldLike`), and owns everything Payload: routes, runner, config injection, admin UI.

## Enforcement (the real boundary)

- The core package's `package.json` has **no payload dependency**, so `import … from "payload"` in
  core simply won't resolve/build — enforcement by construction, stronger than any lint zone.
- `turbo boundaries` becomes applicable at last (package granularity): the core may only import its
  declared deps. Wire it into CI.
- The intra-package oxlint zone rules (slices 5–6) can be **retired** for the moved dirs once they
  live in a payload-free package (keep them only for anything agnostic that remains in the plugin, if
  any). This also resolves the slice-6 `field-config` boundary gap — `field-config` moves into core.

## Migration strategy (strangler, keep the plugin green at each step)

1. Land decouplings 1–2 (retype + guard split) in the plugin; full suite green.
2. Scaffold `packages/translator-core` (package.json, tsconfig, build scripts, vitest, ultracite);
   empty or with a trivial export; `bun install`; confirm it builds.
3. Move modules **leaf-first**, one cohesive group per step, flipping the plugin's imports to
   `@repo/translator-core` and deleting the local copy, tests moving with the code:
   utils → lexical → field-traversal (+ the 3 predicates) → field-config → content-projection →
   translation-providers → translation-pipeline. Verify (tsgo + vitest + oxlint) after each move.
4. Plugin re-exports the public bits; snapshot-diff `src/index.ts` exports = unchanged.
5. Add the CI package boundary; retire the now-redundant intra-package zones.

## Risks

- **Hoisted linker + version overrides.** The repo pins `payload`/`@payloadcms/*` and uses a hoisted
  layout. The core must not acquire payload even transitively — verify `bun install` and that
  `@repo/translator-core`'s resolved tree has no payload. (This is exactly what the no-dep design
  guarantees, but confirm.)
- **Published API must stay identical** — the plugin is published; re-exports must preserve every
  named export + type. Snapshot test the public surface.
- **Monorepo build wiring** — turbo `build`/`check-types` graph must include the new package as a
  dep of the plugin; the plugin's build depends on core's build (or on its source via workspace TS).
- **apps/cms, apps/dev** consume the plugin, not core — unaffected, but re-run their type-check.
- Big-bang in file count, but each leaf-first move is small and independently verified.

## Open questions

1. **`./providers` subpath** vs single entry — keep `openai` out of the core's default dependency
   surface? Recommended: yes, subpath, so `@repo/translator-core` has zero deps and
   `@repo/translator-core/providers` pulls `openai`.
2. **Publish or stay private** — `@repo/*` private until an external consumer exists (default: private).
3. **Build coupling** — does the plugin build against core's `dist` (needs core built first) or its
   `src` via TS project references / workspace source? Mirror how other `@repo/*` buildables are wired.
4. **Test split** — pure tests move with their module into core; adapter/integration tests stay.
5. **`FieldLike` home** — it currently lives in `field-traversal/types`; it is the core's central
   contract. Fine to keep there, or promote to a top-level `contracts` module in core.

## Out of scope

- The provenance feature (#47) itself — it will consume `@repo/translator-core` (`ContentProjector`,
  `Fingerprinter`, `ProvenanceStore`), but is separate work.
- The deferred author-managed cross-locale correlation key.
- Deleting the dead `filterLocalizedFields` (separate cleanup).
