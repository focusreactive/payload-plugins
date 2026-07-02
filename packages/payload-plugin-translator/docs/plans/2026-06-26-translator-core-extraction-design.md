# `@repo/translator-core` extraction — design

**Date:** 2026-06-26
**Status:** Draft — **revised after architecture review** (`2026-06-26-architecture-review.md`).
The first pass framed the coupling as "Payload `Field` *type* only"; the review proved that is
**incorrect at runtime**. This revision corrects the boundary and the slice order accordingly.
**Scope:** Carve a framework-agnostic translation **core** out of `payload-plugin-translator`
into a separate workspace package, **contract-first**. No behaviour change to the plugin; the
plugin becomes a Payload **adapter** over the core. Enables the provenance work
(`2026-06-26-translation-provenance-and-lifecycle-design.md`) to build on stable core contracts.

---

## Goal & principles

Extract the parts of the plugin that have **nothing to do with Payload** (Lexical text
extraction, the translation pipeline logic, the provider port) into `@repo/translator-core`. The
Payload-specific layer (HTTP routes, runner, config injection, admin UI) stays in the plugin and
depends on the core.

**Principles:**

1. **Contract-first, explicit type-only modules.** Define the core's ports as `interface`/`type`
   in plain `*.ts` modules consumed via `import type`. **Not** ambient/global `.d.ts` — rejected
   for package hygiene, boundary clarity, and because parts of the contract have a runtime side.
2. **One source of truth for contracts with runtime parts.** Where a contract needs runtime
   validation/defaults (the codebase uses zod heavily), co-locate a zod schema and derive the type
   with `z.infer`. No hand-written type duplicating a schema.
3. **The core never imports `payload` / `@payloadcms/*` / `next` / `react`.** This is the invariant
   that makes it a core. It must be **enforced by a boundary lint / CI check** — which **does not
   exist yet** and is created as part of the capstone slice (see slice 7). Until then the invariant
   is verified by a CI `grep` over the core package.
4. **Strangler extraction, not big-bang.** Define a contract → make the existing code satisfy it →
   move the implementation behind the port → flip the import. The plugin keeps working at every
   step.

## The boundary (corrected after review)

A naive `grep` for `from "payload"` shows mostly type-only imports — which is what the first pass
read. The review traced the **runtime** call graph and found the type-only reading is wrong for the
pipeline. Corrected classification:

**Already framework-agnostic at runtime (move to core):**
- `server/modules/translation-providers/*` — `TranslationProvider` is **already a clean port** (no
  `payload` import; fan-in 18). This is the proof the boundary is viable; it ships first.
- `server/shared/lexical/*` (runtime) — pure Serialized-Lexical-JSON walking. **Caveat:**
  `lexical/types.ts` imports the `Serialized*` types from `@payloadcms/richtext-lexical/lexical`.
  That is type-only but it is a **`@payloadcms/*` package dependency** and will trip the core
  boundary rule. Must be re-pointed to upstream `lexical` (the real definer) or inlined as
  structural types. (Slice 2.)

**Claimed "type-only" but actually RUNTIME-coupled to Payload (the keystone problem):**
- `server/shared/field-traversal/kernel.ts` imports **five runtime functions** from `payload/shared`
  — `fieldAffectsData`, `fieldIsArrayType`, `fieldIsBlockType`, `fieldIsGroupType`, `tabHasName`.
  These are **values**, not types. Every "pure" traversal (`walkFields`, `findFieldByPath`,
  `FieldChunkCollector`, `DataReconciler`, `filterLocalizedFields`) **transitively executes** them.
  So the pipeline is runtime-coupled, not type-only.

**Payload adapter (stays in the plugin):**
- `server/features/*` — every HTTP route/handler (`PayloadRequest`, `req.payload`).
- `server/modules/task-runner/*` — Payload Jobs / runner integration.
- `server/modules/translation-levels/PluginConfigBuilder` — config injection.
- `server/shared/http/withErrorHandler.ts` — runtime `APIError` from `payload`; **must NOT move to
  core** (it is barrelled with the agnostic `ServerResponse` — split the barrel).
- `plugin.ts`, all of `client/*` (admin UI), field-config wiring.

## The two real couplings to break (was: "the `Field` type")

The first pass said the only dependency is the `Field` **type**, fixed by a `FieldLike` rename. The
review showed there are **two** couplings, and the type swap alone fixes neither:

### (a) `kernel` executes Payload predicates at runtime — re-implement them
The five `payload/shared` functions are **pure structural checks** (verified against Payload's dist):
`fieldIsArrayType = f => f.type === 'array'`, `fieldAffectsData = f => 'name' in f && f.type !== 'ui'`,
`tabHasName = t => 'name' in t`, etc. They carry **no Payload internals** and re-implement in ~5
one-liners over `FieldLike` with zero payload dependency. Decoupling `kernel` breaks the runtime
edge for all six consumers **at once**. The dispatch order (`tabs → transparent → group → array →
blocks → leaf`, documented in `kernel.ts`) is load-bearing and must be preserved; add a parity test
asserting the re-implementation matches `payload/shared` on a fixture schema before deleting the
import.

### (b) `FieldLike` must cover the full walker contract, not just the input
The `FieldWalker<Cursor, Out>` **callbacks** are Payload-typed, not just the input array:
- `enterObject(field: NamedGroupField | NamedTab, …)`
- `enterList(field: ArrayField | BlocksField, …)`
- `leaf(field: LeafField, …)` where `LeafField = Exclude<FieldAffectingData, ArrayField | BlocksField | NamedGroupField | TabAsField>`

Swapping the input `Field[] → FieldLike[]` leaves these callbacks naming Payload types, so the core
would still `import` them. The three concrete walkers (`reconcileWalker`, `FieldChunkCollector`'s
inline walker, `filterWalker`) only read `name / type / localized / fields / blocks / custom` — a
small structural surface that `FieldLike` satisfies. The **hard piece** is `LeafField`: a computed
`Exclude` over Payload's union must become a **positive structural leaf type** (data-affecting, has
`name`, no children) without admitting `TabAsField`/containers — get this wrong and leaf dispatch
silently widens. A compile-time conformance test (`Field` assignable to `FieldLike`) guards the
adapter side.

### (c) supporting: `field.custom` accessors over-typed
`getFieldTranslationConfig` / `isFieldExcludedFromTranslation` are typed `Field` but read **only**
`field.custom`. Widen the signature to `{ custom?: Record<string, unknown> }` (which `FieldLike`
satisfies) so `FieldChunkCollector` can move without dragging `payload` in.

## First contracts (ports)

```ts
// schema the core understands — MUST include `name` (kernel predicates need it)
interface FieldLike {
  name?: string; type: string; localized?: boolean;
  fields?: FieldLike[]; blocks?: ...; tabs?: ...; custom?: Record<string, unknown>;
}
// positive structural leaf — replaces the computed `Exclude<FieldAffectingData, …>`
interface LeafFieldLike { name: string; type: string; localized?: boolean; custom?: Record<string, unknown> }

// pure, READ-ONLY projection: document + schema → translatable text set, identity-keyed
interface ContentProjector { project(doc: unknown, schema: FieldLike[]): Array<{ idPath: IdPath; text: string }>; }

// branded id-path — NOT a bare string (see review finding on stringly-typed idPath)
type IdPath = string & { readonly __brand: 'IdPath' };

// stable hash of a projection (id-path keyed + sorted → reorder-invariant)
interface Fingerprinter { hash(projection: Array<{ idPath: IdPath; text: string }>): string; }

interface TranslationProvider { /* current contract, moves as-is */ }
interface ProvenanceStore { get(key): Promise<ProvenanceRecord | null>; upsert(record): Promise<void>; }
```

Note `ContentProjector` is **read-only** — see slice 6: today the collector fuses mutation into the
traversal, so this contract cannot be factored out without splitting read from write.

## Revised slice order

Keystone first; the review changed which slices are prerequisites.

1. **Keystone — `kernel` predicate re-implementation + full-contract `FieldLike`** (Themes 1+2 of the
   review, **landed together** — they co-define). Until `kernel` stops *executing* `payload/shared`
   and the walker callbacks stop *naming* Payload types, nothing can be extracted. Risk: M (the
   `LeafField` structural rewrite); guard with a parity test + conformance test.
2. **`field.custom` accessor widening** (small, independent prerequisite for the collector move).
3. **Lexical types** — re-point to upstream `lexical` or inline; removes the `@payloadcms/*` package
   dep from `shared/lexical`.
4. **Dependency-direction fixes** (review Theme 5) — relocate `CollectionSchemaMap` out of
   `features/translate-document` into a shared/pipeline types module; move shared wire contracts
   (`FieldTranslationResult`, `RawPayloadComponentExport`) to neutral locations; invert the route
   wiring so `features` composes the level/route factories instead of `modules` importing them.
   **Add the boundary lint here** so edges can't regrow.
5. **`TranslationProvider`** move (already clean) — proves the package wiring end-to-end. Can run
   anytime; low risk.
6. **Read-only `ContentProjector` + branded `IdPath`** (review Theme 6) — **needs a provenance
   design revision, not a patch.** Split the collector into a pure projection vs the write/apply
   path; re-key the content artifact from `textMap: Record<number,string>` to id-path-keyed so
   translation and fingerprint share ONE projection. Big-bang on the data model; settle the design
   before coding. Depends on slice 1.
7. **Capstone — create `@repo/translator-core`, move the agnostic surface, enforce the no-payload
   boundary in CI.** Depends on slices 1–4.

After slice 6 the provenance foundation can start on stable core contracts.

## Package & build

- Location: `packages/translator-core`, name `@repo/translator-core`, **private initially**.
- Same toolchain: swc build, tsgo `check-types`, vitest, ultracite.
- **Dependencies:** `zod`; `lexical` (if the Serialized types are imported from upstream rather than
  inlined). **No** `payload` / `@payloadcms/*` — not even peer. That absence is the whole point.
- The plugin adds `@repo/translator-core: workspace:*`.

## Open questions

1. **`LeafFieldLike` fidelity** — reproduce `Exclude<FieldAffectingData, …>` as a positive type
   without admitting containers/`TabAsField`. This is the riskiest type in the extraction.
2. **`IdPath` grammar** — dot-separated? how are array/block element `id`s encoded vs positional
   indices? how is `blockType` represented? Decide and enforce via the construction function.
3. **Shared zod schemas** — split "pure domain schemas" (core) from "HTTP request schemas" (plugin).
4. **`ContentProjector` read/write split** — does the existing collector get a parallel pure path,
   or are the chunk types refactored to separate identity (`idPath`) from write-handle
   (`dataRef`/`nodeRef`)? (Provenance-doc decision.)
5. **Lexical types** — upstream `lexical` import vs inline structural definitions.
6. **Publish vs private** — stays `@repo/*` private until there's a consumer outside this repo.

## Out of scope

- Moving the admin UI or runner — inherently Payload/React adapters.
- The provenance feature itself — separate doc; this only provides the ports it stands on.
- Renaming/replacing the `TranslationProvider` contract — it moves as-is.
