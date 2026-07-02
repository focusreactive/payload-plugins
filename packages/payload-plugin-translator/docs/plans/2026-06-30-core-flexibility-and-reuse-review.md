# Translator core — flexibility & reuse review

**Date:** 2026-06-30
**Status:** Review report (read-only analysis; roadmap for follow-up `/sp-task`s — no code changed).
**Scope:** the framework-agnostic core at `src/core/**` and its provider adapter `src/translation-providers/**`.
**Method:** `/sp-architecture-review` (cartographer → 4 lenses: layers-boundaries, coupling-dependencies,
abstractions-models, dataflow-state → opus synthesis) + a parallel research agent on reusing the core
outside Payload.
**Part of:** the `@repo/translator-core` extraction (issue #59, branch `feat/translator-core`).

---

## Verdict

The core is already in good shape: the framework boundary genuinely holds (no import cycles, no
`core → server/client/payload` edges — enforced by the oxlint zone + `no-payload-boundary.test`),
`walkFields`/`FieldLike` is a strong generic traversal engine, and `TranslationProvider` is a clean,
by-instance port (the model the rest should follow). The flexibility gap is **three missing
injectable seams** plus an **unenforced public surface**. Traversal + pipeline are already
source-agnostic; two hard couplings (rich-text format, element identity) are what still tie the core
to Payload/Lexical conventions.

## Intended architecture (target)

Ports/adapters, contract-first. `src/core/**` stays framework-agnostic. The plugin is the Payload
adapter; providers implement the `TranslationProvider` port from `src/translation-providers/<vendor>/`.
The forward move: make the remaining Payload/Lexical assumptions injectable through **named ports** so
the same core can drive Portable Text / Contentful / Slate and non-Payload data —
(1) a **content codec port** (format knowledge), (2) a **translation-policy contract** (what is
translatable + strategy selection), (3) a **complete public surface with a `ports/` home**.

## System map (brief)

- `content-projection/` — read-only projection + fingerprint; `translatableLeaf.ts` is the shared
  "which leaf, what source text" decision.
- `field-traversal/` — payload-agnostic `walkFields`/`FieldLike` kernel (clean, generic).
- `translation-pipeline/` — 5 stages over a mutable `PipelineContext`: DataReconciler →
  FieldChunkCollector → TextChunkExpander (injectable expanders) → Translation (provider port) →
  TranslationMutator (closed writer).
- `translation-pipeline/strategies/` — open `TranslationStrategy` interface, but a name-based factory
  + closed union.
- `translation-providers/` (in core) — the port; `src/translation-providers/openai/` — the impl.

---

## Themes (prioritized — top-to-bottom is execution order)

Tag `[reuse]` = also unlocks non-Payload reuse.

### 1. Ports home + complete public core surface — `[impact: M · risk: L · effort: S]` `[reuse]`
- **Problem:** `core/index.ts` is not a real contract surface — it omits `utils`, `lexical`,
  `field-config`, and the concrete strategies, so even the shipped OpenAI provider deep-imports
  `../../core/utils/isObject` and `../../core/translation-providers/TranslationProvider.interface`.
  There is no canonical home for contracts (the port sits in `core/translation-providers/`, which
  name-echoes the top-level impl dir), so themes 2–4 would add new ports ad hoc.
- **Evidence:** `src/core/index.ts` (omits utils/lexical/field-config/strategies);
  `src/translation-providers/openai/OpenAITranslation.provider.ts:7-8` (deep import);
  `core/translation-providers/` vs `src/translation-providers/` echo.
- **Why it matters:** every deep import is a rewrite at `@repo/translator-core` extraction time; and
  without a `ports/` convention the next contract lands wherever its author guesses.
- **Direction:** introduce `core/ports/` as the single home for all contracts (`TranslationProvider`
  + the codec/registry ports below); make each module `index.ts` its complete barrel and `core/index.ts`
  the one public surface; add a lint rule that consumers import via barrels. Renaming the in-core
  provider dir to `core/ports/` also resolves the `translation-providers` naming echo.
- **Sequencing:** keystone enabler — cheap, low-risk, defines where 2–4 land. Do first. Safe incremental.
- **Execute via:** `/sp-task`

### 2. Single translatable-field vocabulary + exclusion-predicate port — `[M · L · S]` `[reuse]`
- **Problem:** the translatable-type set (`text|textarea|richText`) is hand-mirrored in two places
  with no shared source and no parity test; the exclusion rule is hardwired to Payload's
  `custom.translateKit.exclude` key with no injection point.
- **Evidence:** `core/content-projection/translatableLeaf.ts:17-18` (`isTranslatableFieldType`) vs
  `server/shared/guards/field-guards.ts:12` (`isTranslatableField`); `translatableLeaf.ts:28-31`
  (selection whitelist + exclusion); `core/field-config/getFieldConfig.ts` (`TRANSLATE_KIT_CUSTOM_KEY`).
- **Why it matters:** the two vocabularies can silently drift; the hardwired `custom.translateKit` key
  is a Payload-ism a non-Payload host can never satisfy (so it can never exclude fields).
- **Direction:** one exported vocabulary constant consumed by both guards, guarded by a parity test;
  lift selection into an injectable translation-policy input (`translatableTypes` set +
  `isExcluded(field)` predicate), defaulting to today's Payload behavior in the adapter. The core stops
  naming `custom.translateKit`.
- **Sequencing:** cheap high-value; cleaner after theme 1. Safe incremental (default preserves behavior).
- **Execute via:** `/sp-task`

### 3. Content codec port — unify all format/Lexical knowledge — `[H · M · L]` `[reuse]` — HEADLINE
- **Problem:** rich-text/Lexical format knowledge is reimplemented in four independent sites that agree
  only incidentally. Source text is derived twice — a normalized **join** for projection/fingerprint
  vs **per-node** for write-back — so fingerprinted text and translated text can diverge. The write path
  is asymmetric: expanders are an open injectable array, but the mutator is a **closed if/else that
  silently drops** any chunk kind it doesn't recognize (no exhaustiveness).
- **Evidence:** join `content-projection/translatableLeaf.ts:41-54`; per-node
  `stages/text-expander/RichTextExpander.ts:17-41`; emptiness `strategies/SkipExisting.strategy.ts:16-24`;
  closed union `types/TextChunk.ts:37` consumed by `stages/translation-applicator/TranslationMutator.ts:18-29`.
- **Why it matters:** the single biggest blocker to non-Payload reuse (Portable Text / Contentful / Slate
  need edits in four files); a live correctness risk (fingerprint vs translation divergence); and the
  prerequisite for trustworthy provenance.
- **Direction:** a `ContentCodec` port keyed by field type with `extractText(value)` (the one
  source-of-truth text used by both projection and collection), `isEmpty(value)`, `expand(value) → chunks`,
  and `writeBack(chunks, translations) → value`. Register codecs (Plain, Lexical) in a registry the
  pipeline resolves by `schema.type`; make the writer **symmetric to the expander** so an unregistered
  format is a typed error, not a silent drop. `SkipExisting.isEmpty` and `leafSourceText` both delegate
  to the codec.
- **Sequencing:** depends on theme 1. Highest impact, largest effort, touches the pipeline hot path —
  its own designed migration, staged: land the port + registry with the existing Plain/Lexical codecs
  (behavior-preserving), then collapse the four call sites one at a time. Existing per-stage tests de-risk it.
- **Execute via:** `/sp-task` (with a short design pass first).

### 4. Strategy registry — one open taxonomy end to end — `[M · M · M]`
- **Problem:** the pipeline accepts an open `TranslationStrategy` object, but selection is closed and
  duplicated: `translateContent` takes a `TranslationStrategyName` string, `createTranslationStrategy`
  is a switch with a silent `default`, and the literal union `"overwrite" | "skip_existing"` is
  hand-copied across ~8 sites with no import link — including the persisted job payload and client zod
  enums.
- **Evidence:** `strategies/index.ts:11-24`; `translateContent.ts:23,46`;
  `server/modules/task-runner/types.ts:27`, `payload-jobs-runner/normalizeJob.ts:19`,
  `features/enqueue-translation/model.ts:13`, client `.../schema.ts` (×2), `.../constants.ts` (×2),
  `client/entities/translation/api/mutations/useQueueDocumentTranslation.ts:7`.
- **Why it matters:** a provenance-aware strategy (on the roadmap) cannot be added without editing core,
  the persisted job type, and the client in lockstep; the silent `default` degrades an unknown persisted
  name to `overwrite` without warning.
- **Direction:** a strategy **registry** (register by name in one place; resolve through it, or accept
  the object directly like `TranslationProvider`); export the name set as the single source the zod
  enums + job payload import; unknown name → explicit error.
- **Sequencing:** after theme 1 (registry lives in the ports home); prerequisite for the provenance
  strategy. **Risk M — touches the persisted job payload**; validate back-compat / migration for
  in-flight jobs.
- **Execute via:** `/sp-task`

### 5. Typed per-stage contracts — `[M · L · M]`
- **Problem:** `PipelineContext` is an all-optional mutable bag; stage preconditions are enforced by
  runtime `throw`s, not types, so inserting/reordering a stage (e.g. a provenance-recording stage) is
  unguided.
- **Evidence:** `types/PipelineContext.ts:16-21` (all outputs optional); runtime throws in the stages;
  `TranslationPipeline.execute` threads one widening context.
- **Why it matters:** the provenance feature needs to slot a stage in safely; today that is trial-and-error
  against runtime errors.
- **Direction:** typed per-stage input/output (progressive context typing or explicit stage I/O types) so a
  new stage is type-checkable, not throw-checked.
- **Sequencing:** lowest; do alongside/just before the provenance work; benefits from theme 3's writer seam.
- **Execute via:** `/sp-task`

---

## Reusing the core outside Payload (via an adapter)

**Already reusable:** traversal + pipeline are genuinely source-agnostic — the schema is a structural
`FieldLike`, documents are plain `Record`, the provider is a clean port, and `walkFields` never reads the
data shape. A plain-JSON / other-CMS consumer that reshapes its data into Payload's conventions could drive
the core today; the adapter, not the core, currently absorbs all the impedance.

**Two hard couplings block clean reuse — each is a port:**
1. **Rich-text format = Lexical serialized JSON** — the `src/core/lexical/**` shape (`{root}`, `children`,
   `{type:"text", text}`) is assumed by text extraction, emptiness, expansion, and the `RichTextChunk`
   write model. Portable Text (Sanity), Contentful Rich Text, and Slate share none of it. → **This is
   Theme 3 (Content codec port)** — shared with the flexibility roadmap.
2. **Element identity = `id` (+`blockType`)** — `matchElementById`, `elementSegment`, `resolveBlockFields`
   assume a scalar `id` and a `blockType` discriminator (Payload-isms; Sanity uses `_key`/`_type`). →
   An **identity port** (`idOf` / `discriminatorOf` / `stripId`, or configurable key names). This is
   **reuse-only** and sits on top of a *sanctioned* decision (idPath identity; cross-locale
   independent-blocks are out of scope), so it is **not** on the main roadmap — it's a separate future
   reuse push.

**Soft couplings (adapter-absorbable / covered by themes above):** the two-document localized model
(the adapter supplies two per-locale trees), the `custom.translateKit` exclusion key (Theme 2), and the
hardcoded field-type name strings (Theme 2).

---

## Sequencing summary

Keystone enabler is **Theme 1** (cheap, unblocks everything, defines the `ports/` home). Cheap
high-value follow-on is **Theme 2**. The headline and reuse-critical piece is **Theme 3 (Content codec
port)** — stage it as its own behavior-preserving migration. **Theme 4** unblocks the provenance
strategy but carries persisted-job-payload risk to validate. **Theme 5** is the provenance-stage enabler.
**Themes 1, 2, 3** are the set that makes the core both flexible and reusable outside Payload; the
**identity port** is the remaining reuse-only piece, deferred.

## Out of scope / sanctioned (considered, not flagged)

- Core boundary cleanliness — confirmed genuinely clean; not relitigated.
- `FieldLike`/`LeafFieldLike`; `idPath` `id+blockType` identity; cross-locale independent-blocks — sanctioned
  rigidity (the identity port is a reuse-only nicety, not a defect).
- richText field-level projection + per-node write; `classifyField`'s closed 5-way switch (Payload's closed
  taxonomy + exhaustiveness guard — correct as a closed model).
- Option C (internal `src/core`, package deferred); provider port in core / impls outside; no zod in core;
  `openai` optional; `FieldChunkCollector` read/write split; dead `filterLocalizedFields`.

## Deferred to /simplify (local, not architectural)
- `core/field-config/getFieldConfig.ts` — deprecated `getTranslateKitFieldConfig` alias; remove per
  `docs/DEPRECATIONS.md` once callers are gone.
