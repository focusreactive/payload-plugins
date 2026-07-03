# Architecture Review — `@focus-reactive/payload-plugin-translator`

**Date:** 2026-06-26
**Method:** `/sp-architecture-review` — cartographer map → 4 lens reviewers (layers-boundaries,
coupling-dependencies, abstractions-models, dataflow-state) → opus synthesis.
**Focus:** validate the planned `@repo/translator-core` extraction
(`2026-06-26-translator-core-extraction-design.md`) and its provenance follow-up
(`2026-06-26-translation-provenance-and-lifecycle-design.md`).

---

## Verdict: the extraction doc's central premise did NOT hold (now revised)

The first-pass doc classified `field-traversal/*` and the pipeline as "coupled to Payload only via
the `Field` *type*", with `FieldLike` as a structural-compatibility rename at the input boundary.
Two confirmed facts break this:

1. **Runtime, not type-only.** `kernel.ts:2` imports five **runtime** functions from `payload/shared`
   (`fieldAffectsData`, `fieldIsArrayType`, `fieldIsBlockType`, `fieldIsGroupType`, `tabHasName`).
   Every pure traversal transitively executes them. A `FieldLike` type swap does nothing about a
   runtime import. The decouple is a **predicate re-implementation** (the five are pure structural
   checks), not a type swap.
2. **Wrong seam.** Payload types surface through the `FieldWalker` **callbacks**
   (`LeafField`, `NamedGroupField|NamedTab`, `ArrayField|BlocksField`), not just `schema: Field[]`.
   `FieldLike` at the input with Payload-typed callbacks still imports payload types into core.

The target is right; the doc has been revised to (a) treat `kernel` as a predicate
re-implementation, and (b) define `FieldLike` across the full walker contract, with `LeafField`
(a computed `Exclude`) becoming a positive structural type.

A third finding hits provenance phase 2: the "one `ContentProjector` shared by translation +
fingerprint" premise is contradicted by the current pipeline — content lives in
`textMap: Record<number,string>` (index-keyed, order-dependent) and the collector fuses mutation
into traversal (`FieldChunkCollector.leaf` writes data + emits live write-handles). A read-only
id-path projection cannot be factored out without restructuring; otherwise the fingerprint is a
second independent traversal that can drift → silent false-stale. **This is a design revision, not
a patch.**

## Prioritized roadmap (themes)

1. **Re-implement the field-classification kernel as pure predicates** — `[impact H · risk L · effort S]`
   — **keystone**. One file; breaks the runtime payload edge for all six consumers at once. Preserve
   dispatch order; add a parity test before deleting the `payload/shared` import.
2. **Define `FieldLike` across the full walker contract** — `[H · M · M]` — co-requisite of #1.
   Hard piece: `LeafField` (`Exclude<…>`) → positive structural type. Conformance test guards that
   Payload `Field` stays assignable.
3. **Widen `field.custom` accessors to a structural shape** — `[M · L · S]` — unblocks the collector
   move.
4. **Own the Lexical serialized types from `lexical`, not `@payloadcms/richtext-lexical`** — `[M · L · S]`.
5. **Fix cross-layer dependency edges + add boundary lint** — `[H · M · M]` — `modules→features`
   (runtime + `CollectionSchemaMap`), `server→client` (widgets + `RawPayloadComponentExport`),
   `client→server` (`FieldTranslationResult`). Relocate misplaced contracts; invert route wiring;
   add an import-restriction rule so edges can't regrow.
6. **Re-found the pipeline content model on a read-only id-path projection** — `[H · risk H · L]` —
   **revise provenance phase 2.** Split read (projection) from write (apply); branded `IdPath` with
   a documented grammar; re-key `textMap` to id-path. Big-bang on the data model; depends on #1+#2.
7. **Move the agnostic pipeline + traversal into `@repo/translator-core`** — `[H · M · M]` —
   **capstone.** Safe only after #1–#5. Create the package (deps: `zod`, `lexical`; no `payload`);
   enforce the no-payload boundary in CI.

**Sequence:** 1+2 (keystone, together) → 3,4,5 (parallel, safe prep) → 6 (with design revision) →
7 (capstone).

## Deferred to /simplify (local, not architectural)
- `server/shared/http/index.ts` barrel mixes Payload-bound `withErrorHandler` with Web-native
  `ServerResponse` + type-only `withAccessCheck` — split the barrel.
- `schemaMap` threaded through 5 relay layers; `PluginConfigBuilder` is a non-consumer relay — fold
  once theme 5's wiring is settled.

## Out of scope / sanctioned (considered, not flagged)
- `TranslationProvider` moves as-is (the agnostic extraction model, fan-in 18).
- `JSON.parse(JSON.stringify())` schema clone in `plugin.ts` (Payload-sanitize workaround; its TODO
  is addressed by theme 2).
- id-based cross-locale matching + supported-regime + field-level noop guard.
- Hoisted bun linker + pinned payload overrides; deliberate UI deps; in-memory job filtering in
  `PayloadJobsTaskRunner` (documented drizzle workaround).
- The **status-durability gap** (status read only from the transient runner queue,
  `get-document-status/handler.ts`) is a real finding, distinct from the sanctioned job-filtering
  workaround — it is exactly what provenance phase 2 closes; mind the migration window where runner
  + provenance both partially answer "is this translated?".
