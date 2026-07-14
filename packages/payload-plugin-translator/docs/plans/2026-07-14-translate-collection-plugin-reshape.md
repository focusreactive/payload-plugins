# Architecture Design — `TranslateCollectionPlugin` orchestration reshape

**Date:** 2026-07-14
**Method:** structured forward architecture design — a system map, then 3 candidate designs from
distinct guiding priorities (max-reuse · min-new-abstraction · cleanest-boundaries), then adjudication.
**Status:** decided design; implementation deferred to sequenced, individually-scoped tasks.
**Precondition:** the #50 staleness feature has landed (PR #71). This reshape assumes it is on `main`.
**Supersedes:** the roadmap in `2026-07-07-translator-architecture-review-provenance.md` (that was a
review; this is the decided forward design). Themes 1–3 there map to build steps 1–4 here; Theme 4
(client staleness cache-invalidation) stays a separate client-only task, out of this scope.

---

## The ask (ground truth)

Reshape the internal orchestration of `TranslateCollectionPlugin` (`src/plugin.ts`) — a ~115-line
`init()` closure that builds the schemaMap, resolves/guards the provenance slug + builds the store
factory, constructs the document handler + runner/lifecycle context, extends levels, and appends raw
config modifiers (runner + provenance sidecar/cleanup) — into a thin composition root. Consolidate the
provenance logic spread across ~18 files. Decide whether `src/core` should be sub-layered. Leave a
clean extension seam for the next feature **#51** (auto-translate on source-locale change).

**Scope in:** internal structure of the plugin composition root, provenance module, dependency-context
carrier, and the #51 extension seam (design only).
**Scope out:** the #51 implementation itself; client staleness cache-invalidation (separate task);
any change to `src/index.ts` (the published surface).

**Constraints:** internal interfaces may be reshaped freely; the public API must stay working —
`translatorPlugin`, `TranslatorPluginConfig`, the deprecated `TranslateCollectionPlugin` class +
`.init()` + `createTranslatePlugin` + `TranslateCollectionPluginConfig`, `documentLevel`/
`collectionLevel`/`fieldLevel`, providers, runners, `withFieldTranslation`, and the lifecycle /
provenance-record / access types. Precedent to mirror: `TaskRunnerProvider.configure(ctx) →
ConfigModifier` + a dedicated `TaskRunnerFactory` port file.

**NFRs:** provenance stays best-effort (never fails a translation); #51 must be loop-safe; no data
migration (internal refactor); #51 opt-in default-off, implementation deferred; the JSON-round-trip
`schemaMap` clone is sanctioned.

---

## How it lands on the system

- **Reuse:** `TaskRunnerProvider.configure(ctx) → ConfigModifier` (the shape to mirror);
  `PluginConfigBuilder.applyTo` (the single config-mutation sink, unchanged); `provenanceCleanupHook`
  (the marker + iterate-managed-slugs + non-destructive-append idiom #51's hook will copy); the #50
  drift primitives (`ProvenanceStore` port, `isRecordStale`, `computeSourceFingerprint`,
  `fetchSourceDocument`); `TaskRunnerFactory.enqueue`; `LifecycleNotifier`.
- **Affected:** `plugin.ts`; `server/modules/provenance/*`; `server/features/translate-document/handler.ts`;
  `server/features/staleness/*`; `server/features/_lib/sourceDocument.ts`;
  `server/modules/translation-levels/{types.ts, PluginConfigBuilder.ts}`; `server/features/createTranslationRoutes.ts`.
- **Fit:** config-time wiring → per-module `configure(ctx) → ConfigModifier`; provenance write/read
  policy → a `ProvenanceService` above the core CRUD port; dependency carrier → one `TranslationContext`;
  #51 → a future `server/modules/auto-translate/` slotting into the uniform `configure()` list.

Gradient (down): `plugin.ts → composition/features → server/modules → server/shared → core`; `types/`
is the low shared-contract layer. No up/side edges; no cycles.

---

## The design (decided)

Spine = **cleanest-boundaries**, with three grafts from the other candidates and one placement
override forced by the invariant checklist. All changes are internal — `src/index.ts` does not move,
so **R7 holds by construction**.

**Abstractions (each cleared against the ≥2-caller rule):**

- **`ProvenanceService`** (`src/server/modules/provenance/ProvenanceService.ts`) — single owner of the
  fingerprint write/read/compare **policy**: `captureFingerprint(pristineSource, schema) → string | null`
  (best-effort, catches + logs), `record(key, fingerprint)`, `getStaleness(collection, docId)`,
  `dismiss(key)`. **Invariant:** one hash owner, one fetch shape — write and read can never drift.
  **Callers:** the write path (`translate-document/handler.ts`), the staleness read
  (`getDocumentStaleness.handler`), dismiss (`dismissStaleness.handler`); a 4th traceable caller is
  #51's drift-gate (R5).
- **`fetchSourceDocument`** relocated to `src/server/shared/payload/sourceDocument.ts`. **Callers:** the
  translate handler (fetches pristine source for the pipeline — a non-provenance concern) and
  `ProvenanceService` (re-fetches live source to re-fingerprint).
- **`ConfigModifier`** — type promoted to an exported name from `translation-levels` (graft from B).
  **Callers:** `TaskRunnerProvider.configure` (existing), `provenance.configure` (new), #51 `configure`
  (traceable).
- **`TranslationContext`** carrier — the single dependency bundle. **Callers:** `PluginConfigBuilder`,
  `LevelContext` (extends), `StalenessConfig` (Pick), `TranslationRoutesDeps` (Pick).

**Dependency direction:** `plugin.ts → provenance.configure()` / `→ wireTranslateRunner` (down);
`ProvenanceService (modules) → shared/payload/fetchSourceDocument → core` (down); staleness handlers
(features) → `provenanceServiceFactory` (modules, down); `TranslationContext (translation-levels module)
→ TaskRunnerFactory, ProvenanceStoreFactory` (intra-`modules`, matching the already-accepted structure
of `PluginConfigBuilder.ts`). No cycles.

**Placement:** fingerprint policy → `server/modules/provenance/ProvenanceService.ts`; source fetch →
`server/shared/payload/sourceDocument.ts`; provenance config-wiring → `server/modules/provenance/configure.ts`;
dependency carrier → `server/modules/translation-levels/types.ts` (NOT `types/` — see D3); runner+lifecycle+handler
glue → `server/features/translate-document` via `wireTranslateRunner`; core stays flat.

**Data flow & ownership:** provenance records + fingerprint policy — single owner `ProvenanceService`
(`provenanceServiceFactory(payload)` bound at config time closing over `schemaMap` + `slug`);
`PayloadProvenanceStore` remains the storage port impl underneath. Config mutation — single sink
`PluginConfigBuilder.applyTo` (unchanged). Dependency bundle — single source `TranslationContext`;
all others derive via `Pick`/`extends`.

---

## Requirement coverage

| Req | Design element | Status |
|---|---|---|
| R1 thin init | `provenance.configure()` + `wireTranslateRunner` extraction → flat configure/extend list | met |
| R2 provenance config-wiring into module | `provenance.configure(ctx) → ConfigModifier` | met |
| R3 unify fingerprint policy | `ProvenanceService` = one hash owner; deletes the two hand-kept sites | met |
| R4 single carrier | `TranslationContext` + Pick; delete dead `TranslateDocumentDependencies` | met |
| R5 #51 seam without regrowing init | uniform `configure()` list + `ProvenanceService.getStaleness` drift-gate + `TaskRunnerFactory` enqueue | met (design-only) |
| R6 core layering | flat, justified | met |
| R7 preserve public API | all moves internal; `src/index.ts` untouched | met |
| R8 single config sink | `applyTo` unchanged | met |

---

## Decisions (ADRs)

### D1. Uniform `configure(ctx) → ConfigModifier` convention + thin plugin.ts + single sink — *dependencies*
- **Context:** `init()` inlines slug resolution, collision guard, factory creation, runner/lifecycle
  wiring, and a provenance `addConfigModifier` block. The precedent already exists:
  `TaskRunnerProvider.configure(ctx) → (config) => Config`.
- **Options:** A `configureProvenance` free function; B no interface + export the `ConfigModifier` type
  + extract `wireTranslateRunner`; C `provenance.configure(ctx) → ConfigModifier` convention, explicitly
  rejecting a generic `ConfigModule<T>` interface.
- **Decision:** C's convention (each module exposes `configure(ctx) → ConfigModifier`; plugin.ts becomes
  a flat list), **plus** B's two grafts — export the `ConfigModifier` type, and extract
  `wireTranslateRunner`. Rejecting `ConfigModule<T>` satisfies invariants 1 + 5 (zero polymorphic
  callers = pattern-for-fashion); the convention cites a real precedent; edges stay downward.
- **Consequences:** #51 later adds exactly one `configure` entry (R5). Caveat: `wireTranslateRunner`
  has a single caller (`plugin.ts`); admitted as R1 decomposition-for-thinness with a correct home
  (runner+lifecycle+handler glue belongs beside the translate feature), not as a reuse seam — inlinable
  if a strict reading of invariant 1 objects.

### D2. Provenance write/read fingerprint policy owner — *abstractions / dataflow*
- **Context:** R3 — two hand-kept sites (`handler.ts` write, `staleness/service.ts` read) must fetch
  with identical `depth`/locale and hash with the same `schemaMap`. The single biggest correctness
  trap; today held together by a shared helper + a comment.
- **Options:** A/C `ProvenanceService`; B a lone `deriveCurrentSourceFingerprint` fn leaving best-effort
  / error policy duplicated per site.
- **Decision:** `ProvenanceService` (A/C). Three existing callers (invariant 1); one cohesive state
  cluster = provenance records + their fingerprint policy (not a god-module); collapses the two policy
  sites to one source of truth (R3). B rejected — unifies the hash but not the policy
  (under-decomposition; a 3rd write path re-copies the try/catch). **`fetchSourceDocument` home: C's
  `server/shared/payload/` wins over A's "private to provenance"** — A's "both callers absorbed"
  premise is false: the translate handler still fetches pristine source for the *pipeline*, which is
  not a provenance concern; making it provenance-private would mis-couple the feature. `shared/payload/`
  keeps it a downward util with two legitimate callers.
- **Consequences:** the write path's **capture-before-mutation ordering stays at the call site** — the
  handler fetches pristine source, calls `service.captureFingerprint(pristineSource, schema)` *before*
  `translateContent`, then `service.record(...)` after save. The service owns *how* to hash + the
  best-effort semantics; the handler owns *when* to capture (only it knows pristine-vs-mutated — this
  is the #50-era false-stale fix, now structural). `staleness/service.ts` is deleted; its
  per-source-locale fingerprint cache moves into the service. `provenanceServiceFactory` closes over
  `schemaMap` + `slug`, bound at config time.

### D3. Single dependency carrier + its home — *abstractions / placement*
- **Context:** R4 — `PluginConfigBuilderDeps` / `LevelContext` / `StalenessConfig` /
  `TranslationRoutesDeps` duplicate the same fields; `TranslateDocumentDependencies` is dead.
- **Options:** A/B carrier inside `translation-levels`; C a new `src/types/TranslationContext.ts` in
  the shared-contract layer.
- **Decision:** one `TranslationContext` with the others via `Pick`/`extends`, delete
  `TranslateDocumentDependencies` — **placed in `translation-levels`, overriding C's `types/`.** The
  intended-arch "shared contracts live in `types/`" *seems* to favour C, but the carrier holds
  `taskRunnerFactory: TaskRunnerFactory` and the provenance factory — **impl-side types from
  `server/modules`.** A `types/` file importing them would be a `types/ → server/modules` **upward edge
  (invariant 2 violation).** `translation-levels` already references both sibling-module types, so the
  carrier introduces no new cross-gradient edge.
- **Consequences:** features reach the carrier via a downward `features → modules` import (legal). Fully
  honouring "contracts in `types/`" would first require promoting `TaskRunnerFactory` + the provenance
  factory to ports in `types/`/`core` — a larger, separately-scoped move (deferred; see open questions).
  #51's per-collection config does **not** ride this carrier.

### D4. #51 auto-translate seam — design vs scaffold — *placement / dependencies*
- **Context:** R5 wants a clean seam for afterChange auto-translate ({targets, strategy, debounce},
  drift-gate, loop-guard, best-effort); the NFR explicitly **defers the impl**.
- **Options:** A scaffolds deferred stub files; B ships inert-but-wired real files gated by a config no
  public helper can set; C design-only — reserve the path, specify the shape.
- **Decision:** C (design-only). A's stubs are zero-caller abstractions (invariant 1, disqualified);
  B ships behaviour-bearing dead code into a published package with no reachable caller (premature +
  against the NFR defer, disqualified). The seam R5 needs is **delivered by this refactor already**:
  (1) the uniform `configure()` list means #51 = one new module + one `configure` entry, no init
  regrowth; (2) `ProvenanceService.getStaleness` is the drift-gate; (3) loop-guard = enqueue only on
  source-locale writes; (4) enqueue via `TaskRunnerFactory`.
- **Consequences:** reserved (uncreated) path `server/modules/auto-translate/`; specified core predicate
  `hasTranslatableContentChanged` (payload-free, like `isRecordStale`); hook builder modeled on
  `provenanceCleanupHook`. Honest weak spot: the seam is a convention + this ADR, **not type-enforced**
  — a future author follows the `configure()` shape by discipline. Acceptable given deferral.

### D5. Core layering — split vs flat — *placement*
- **Context:** R6 + the standing "revisit core layering" note (core mixes kernel, interface impls,
  richText entities at one level).
- **Options:** all three candidates chose flat.
- **Decision:** keep core **flat**. It is already organized as feature folders; the one hard invariant
  (framework-free) is enforced by `no-payload-boundary.test.ts`. A kernel/entities/adapters sub-layer
  has no requirement forcing it — inventing it now fails invariants 1 + 5. #47 provenance landed and
  did not surface the need.
- **Consequences:** commits to the flat feature-folder layout; revisit only when a concrete consumer
  forces sub-layering.

---

## Build sequence (each step a small, self-contained task; all incremental)

1. **`ProvenanceService` + relocate `fetchSourceDocument`** — move `fetchSourceDocument` to
   `server/shared/payload/sourceDocument.ts`; create `ProvenanceService` over `PayloadProvenanceStore`;
   rewire the translate handler (capture-before-pipeline, then record) and the staleness handlers;
   delete `staleness/service.ts`. **R3.** Unblocks 2–4. Behavior-preserving; covered by existing
   provenance + staleness tests.
2. **`provenance.configure(ctx) → ConfigModifier`** — absorb `resolveProvenanceSlug`,
   `assertProvenanceSlugFree`, sidecar injection, `injectProvenanceCleanup`, and
   `provenanceServiceFactory` creation; export the `ConfigModifier` type from `translation-levels`.
   **R2.** Depends on 1.
3. **Single `TranslationContext` carrier** — add it to `translation-levels/types.ts`; make
   `PluginConfigBuilderDeps`/`LevelContext`/`StalenessConfig`/`TranslationRoutesDeps` derive via
   `alias`/`extends`/`Pick`; rename `provenanceStoreFactory → provenanceServiceFactory`; delete dead
   `TranslateDocumentDependencies`. **R4.** Depends on 1–2.
4. **Extract `wireTranslateRunner` + slim `init()`** — move runner+lifecycle+handler glue into
   `server/features/translate-document`; reduce `init()` to a flat configure/extend/addConfigModifier/
   addAdminProvider list ending in `applyTo`. **R1.** Depends on 1–3.
5. **Record the #51 seam (design-only)** — no source files; the seam is delivered by steps 1–4. Fully
   specified when #51 is scheduled.

---

## Open questions / unresolved

- **#51 config mechanism** (a #51-time decision): `collection.custom[AUTO_TRANSLATE_KEY]` via a
  `withAutoTranslate` helper vs a `TranslatorPluginConfig.autoTranslate` field + `AutoTranslateContext`.
  **Recommendation:** the `collection.custom` + `withAutoTranslate` idiom — it mirrors the sanctioned
  `withFieldTranslation` (public, separate from `PluginConfigBuilder`) and #51's config is per-collection.
- **Hoisting `TranslationContext` to `types/`** (the intended-arch ideal): blocked until
  `TaskRunnerFactory` + the provenance factory are promoted to ports in `types/`/`core` (else a
  `types/ → modules` upward edge). Deferred; blocks nothing now.
- **Client staleness cache-invalidation** (Theme 4 of the 2026-07-07 review): out of this scope; flagged
  so it is not silently dropped — a separate client-only task.

---

## Rejected / grafted (for the record)

- A.D2 `fetchSourceDocument` private to provenance — rejected (false premise; mis-couples the translate
  feature). Grafted C's `server/shared/payload/` home.
- A.D4 scaffold deferred stub files — disqualified (invariant 1, zero-caller abstractions).
- B.D2 hash-only `deriveCurrentSourceFingerprint` — disqualified as spine (R3 partial /
  under-decomposition).
- B.D4 inert-but-wired auto-translate files — disqualified (premature; unreachable code vs the NFR defer).
- C.D3 carrier in `src/types/` — disqualified (invariant 2, `types/ → server/modules` upward edge).
  Grafted A/B's `translation-levels` placement, keeping C's `Pick`-derivation structure.
- Grafted from B: exported `ConfigModifier` type; `wireTranslateRunner` extraction.
- Grafted from A: the flat plugin.ts `configure`/`extend`/`addConfigModifier` list shape.
