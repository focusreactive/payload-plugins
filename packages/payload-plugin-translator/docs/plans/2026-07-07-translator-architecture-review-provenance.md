# Architecture Review — `payload-plugin-translator` (plugin.ts growth + provenance spread)

**Date:** 2026-07-07
**Method:** `/sp-architecture-review` — cartographer map → 4 lens reviewers
(layers-boundaries, coupling-dependencies, abstractions-models, dataflow-state) → opus synthesis.
**Focus (operator concerns):** (1) `TranslateCollectionPlugin.init()` / `plugin.ts` is growing
(264 LOC); (2) provenance/staleness logic is spread across ~18 files.
**Precondition:** the #50 staleness feature is staged/uncommitted; the roadmap below is to be
executed **after #50 lands** and can assume it is committed.

> Supersedes the provenance-relevant parts of the 2026-06-26 review for the post-#47/#50 state.
> The 2026-06-26 core→payload runtime-coupling themes (predicate re-implementation, boundary lint)
> are **done** — `no-payload-boundary.test.ts` is green — and are not re-raised here.

---

## Intended architecture (ground truth)

Layered ports/adapters + FSD.

- `src/core/` — framework-agnostic domain; payload-free invariant enforced by
  `no-payload-boundary.test.ts` + hand-maintained `field-traversal/predicates.ts` parity. Holds
  **ports** (e.g. `core/provenance/ProvenanceStore.interface.ts`) and pure rules (`isRecordStale`,
  fingerprint/projection).
- `src/server/` — Payload adapter: `features/` (HTTP use-cases), `modules/` (infra services:
  task-runner, provenance, lifecycle, translation-levels), `shared/` (http/access/validation utils).
- `src/client/` — FSD (app/entities/features/widgets/shared).
- `src/composition/levels/` — pluggable surfaces via the narrow `LevelContext`
  (`TranslationLevel.extend(ctx)`).
- `src/plugin.ts` — composition root.
- `src/types/` — shared contracts. Ports in core, impls in server/modules.

**Precedent to emulate:** `TaskRunnerProvider` owns a `configure(ctx) → ConfigModifier` seam and keeps
`TaskRunnerFactory` in a dedicated port file — the pattern provenance should follow.

**Sanctioned (not findings):** UI deps (radix/react-query/zod); provenance opt-in default-off;
`dismissedFingerprint` pre-added in #47; lazy-on-read staleness + doc-panel-only #50 scope;
`LevelContext` intentionally internal; JSON-round-trip `schemaMap` clone (documented TODO).

---

## System map (hotspots)

- **`plugin.ts`** — 264 LOC, fan-out ~12, highest churn. `init()` is a ~115-line closure that builds
  the schemaMap, resolves/guards the provenance slug + builds `provenanceStoreFactory`, constructs the
  document handler + runner/lifecycle context, extends levels, and appends two raw config modifiers
  (runner + provenance sidecar/cleanup).
- **`server/modules/translation-levels/PluginConfigBuilder.ts`** — the single Config-mutation sink;
  also declares `PluginConfigBuilderDeps`, a parallel copy of `LevelContext`'s 7-field shape.
- **Provenance/staleness surface** — ~18 files across `core/provenance`, `core/content-projection`,
  `server/modules/provenance`, `server/features/staleness`, `server/features/translate-document`,
  `server/features/_lib`, `composition/levels`, `client/entities/translation`, `client/widgets`.
  `schemaMap` + `provenanceStoreFactory` are threaded through 6 layers with no carrier type.

### Conflicts resolved during synthesis
- **`server/shared` core re-export** — the façade is heavily used, but the *core re-export block*
  specifically (`index.ts:22-38`) has **zero importers** (everyone imports from `core/*`). → dead
  code (`/simplify`), not a theme.
- **`TranslateDocumentDependencies` drift — confirmed** (`translate-document/handler.ts:14-17`): the
  type declares `{translationProvider, schemaMap}` but the constructor also takes
  `provenanceStoreFactory`; the type is unused. → dead + drifted (`/simplify`).

---

## Themes (prioritized refactoring roadmap)

All four are **internal refactors — none touch the published surface (`src/index.ts`)**: no
`@since`/README churn, no big-bang migration. Order 1 → 2 → 3 (each de-risks the next); Theme 4 is
independent.

### 1. Provenance owns its config-time wiring (mirror `runner.configure()`)  [impact: H · risk: L · effort: M]
- **Problem:** the provenance module exports only primitives (`makeProvenanceCollection`,
  `isProvenanceCollection`, `assertProvenanceSlugFree`, `injectProvenanceCleanup`,
  `PayloadProvenanceStore`); `plugin.ts` hand-assembles them inline into a config modifier, while the
  runner contributes through a single `runner.configure(ctx) → ConfigModifier`. Provenance is the odd
  one out.
- **Evidence:** `plugin.ts:150-159` (slug resolve + factory), `:206-232` (inline modifier: idempotency
  check + `config.collections` splice + `injectProvenanceCleanup`); contrast `plugin.ts:188`
  `runner.configure(runnerContext)` + `task-runner/TaskRunnerProvider.interface.ts`. `plugin.ts`
  directly imports 6 provenance internals. Sibling: `ProvenanceStoreFactory` type lives in the
  concrete adapter (`PayloadProvenanceStore.ts:9`), unlike `TaskRunnerFactory` (dedicated port file).
- **Why it matters:** operator concern #1 (init size) and #2 (spread) in one move; removes raw
  `config.collections` mutation from the composition root that `PluginConfigBuilder` was built to own.
- **Direction:** provenance module exposes `configure(ctx) → ConfigModifier` (idempotently registers
  the sidecar collection + installs the cleanup hook) and `createStoreFactory(slug)`; move
  `ProvenanceStoreFactory` to a dedicated port file. `plugin.ts` calls
  `builder.addConfigModifier(provenance.configure(...))`.
- **Sequencing:** no prereq; unblocks Themes 2 & 3. Safe incremental (config-time only, mirrors a
  tested pattern; covered by `plugin.test.ts` + provenance module tests). Pure internal.
- **Execute via:** `/sp-task`

### 2. Introduce a `ProvenanceService` seam (unify write & read policy)  [impact: H · risk: M · effort: M]
- **Problem:** the port is CRUD-only (`upsert`/`find`/`findByDocument`/`dismiss`/`deleteByDocument`).
  The higher-level policy — "schema → fetch source → fingerprint → upsert" (write) and
  "fetch → fingerprint → compare → isStale" (read) — is re-derived independently per side. Write is an
  inline side-effect; read has a dedicated service. Asymmetric → the next write path copy-pastes.
- **Evidence:** write `translate-document/handler.ts:80-102` (inline `store.upsert` +
  `computeSourceFingerprint`); read `staleness/service.ts:17-32` (`makeCurrentFingerprint`), `:40-79`,
  `:86-103`. Fingerprint composition duplicated across handler + both service functions; parity is
  comment-enforced (`service.ts:10-16`), structurally only the `fetchSourceDocument` shape is shared.
- **Why it matters:** operator concern #2 + the single biggest correctness invariant (write and read
  must hash identically) currently upheld by two hand-kept call sites — a silent false-stale risk.
- **Direction:** `ProvenanceService` in `server/modules/provenance` owns fingerprint derivation over
  the CRUD port: `recordTranslation()` / `computeStaleness()` / `dismiss()`. Handler + staleness
  service become thin adapters. Port stays CRUD; policy moves up one layer.
- **Sequencing:** prereq Theme 1. Risk M — a hashing-parity regression silently breaks staleness; do
  it behind `translate-document/handler.test.ts` + `staleness/*` tests. Pure internal.
- **Execute via:** `/sp-task`

### 3. Single carrier for the plugin dependency context  [impact: M · risk: L · effort: M]
- **Problem:** the same internal dep set (`collections`, `basePath`, `access?`, `taskRunnerFactory`,
  `schemaMap`, `translationProvider`, `provenanceStoreFactory?`) is redeclared field-for-field across
  many shapes with no `extends`/`Pick`; drift already occurred.
- **Evidence:** `PluginConfigBuilderDeps` (`PluginConfigBuilder.ts:19-27`), `LevelContext`
  (`translation-levels/types.ts:39-49`), the builder class props (`:69-90`, a 3rd redeclaration +
  manual copy), `TranslationRoutesDeps` (`createTranslationRoutes.ts:16-26`), `StalenessConfig`
  (`staleness/model.ts:40-44`), the dead/drifted `TranslateDocumentDependencies`. The public
  `TranslatorPluginConfig` is correctly separate — not part of this dup.
- **Why it matters:** adding one provenance-dependent field means editing 4–6 declarations + the
  manual copy; drift already produced a wrong/dead type.
- **Direction:** one `TranslationContext` (or a shared base via `Pick`/`extends`), threaded as a
  single object. Cleaner after Themes 1–2 encapsulate `provenanceStoreFactory` inside the module.
- **Sequencing:** best after Themes 1–2 (fewer fields to unify). Safe incremental (internal types;
  `tsgo` catches breakage; `LevelContext` is sanctioned-internal). Pure internal.
- **Execute via:** `/sp-task`

### 4. Single owner for staleness cache invalidation  [impact: M · risk: L-M · effort: S-M]
- **Problem:** four uncoordinated client sites decide when the staleness query refetches; two are
  provably wrong.
- **Evidence:** `useDismissStaleness.ts:34` (correct, scoped `[KEY, collection, id]`);
  `useRunDocumentTranslation.ts:27` + `useQueueDocumentTranslation.ts:37` (broad `[KEY]` fired at
  enqueue **ack, before the async job runs** → provenance not yet updated → premature);
  `useDocumentTranslation.ts:60-68` (`previousStatusRef` seeded `undefined` → false-positive
  invalidation on every cold mount of an already-`completed` doc).
- **Why it matters:** the two wrong sites make the "Out of date" notice clear prematurely (on enqueue)
  and refetch spuriously (every panel open). No single answer to "when does staleness refresh".
- **Direction:** centralize into one owner — tie invalidation to the observed `completed` transition
  with a correctly-seeded ref; drop the premature enqueue/run invalidations.
- **Sequencing:** independent (parallelizable); pull forward if the two UX bugs are urgent. Client-only;
  risk L-M (thinner client test coverage). No public API change.
- **Execute via:** `/sp-task`

---

## Deferred to `/simplify` (local, not architectural)
- `server/shared/index.ts:22-38` — dead core re-export block (0 importers). Delete.
- `translate-document/handler.ts:14-17` — dead + drifted `TranslateDocumentDependencies`. Delete.
- `client/shared/types/AccessGuard.ts` — byte-dup of `types/AccessGuard.ts` (pulls Payload into the
  client tree), 0 importers. Delete.
- `staleness/service.ts:46,93` — duplicate `schemaMap.get(collection)` (folds into Theme 2).
- `TranslateDocument.export.ts:13` + `BulkTranslationDashboard.export.tsx:9` — `new AnyAccessGuard()`
  default-allow decided independently in two files; centralize the default.

## Out of scope / sanctioned (confirmed, left alone)
- core→payload runtime coupling — **resolved** (predicates + `no-payload-boundary.test.ts`). The
  predicates↔`payload/shared` parity-by-test is a minor latent risk only.
- JSON-round-trip `schemaMap` clone (documented TODO); `LevelContext` internal;
  `dismissedFingerprint`/opt-in/lazy-on-read/doc-panel #50 scope; UI deps.
- `withFieldTranslation` (`field-config.ts:56-76` + `field-actions.ts:31-47`) — refuted as a smell:
  a **public** field-level helper the user calls on their own `Field`, deliberately separate from the
  internal `PluginConfigBuilder` sink.
- Client widgets reaching into `server/shared` for `AnyAccessGuard` + `collectionHasDrafts` — genuine
  FSD boundary crossing, but these are the server-rendered halves (`.server.tsx`/`.export`) that
  legitimately need server config; near-zero cost today (the duplicated default is in the /simplify
  list).

---

## Operator-concern mapping
- **(1) `plugin.ts` / `init()` size** → Themes **1 + 3** (extracting provenance's config wiring is the
  biggest single reduction; the carrier trims the rest).
- **(2) provenance/staleness spread across ~18 files** → Themes **1 + 2** (config wiring into the
  module; runtime policy into a service).
