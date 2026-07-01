# Slice 6 — read-only `ContentProjector` + branded `IdPath` — design

**Date:** 2026-06-30
**Status:** Approach CONFIRMED (option B, 2026-06-30) — implementing. See "Decisions locked".
**Part of:** the `@repo/translator-core` extraction (issue #59, branch `feat/translator-core`).
Slice 6 of `docs/plans/2026-06-26-translator-core-extraction-design.md`.
**Revises:** `docs/plans/2026-06-26-translation-provenance-and-lifecycle-design.md` (its "one
`ContentProjector` shared by translation + fingerprint" premise).

---

## Goal

Produce a **pure, read-only projection of a document's translatable content** — `Array<{ idPath,
text }>` — that **both translation and the provenance fingerprint consume**, so the two can never
disagree on *which* content is translatable or *what identity* it has. This is the foundation the
provenance fingerprint (#47) stands on, and it removes the "fingerprint is a second independent
traversal that can silently drift" risk surfaced in the architecture review.

This slice also addresses the **real core-extraction blocker** the edge investigation found (the
`shared/index.ts` barrel re-exporting a payload runtime import) as a companion, since the pipeline
files it refactors are the ones that import that barrel.

## Decisions locked (2026-06-30)

- **Option B confirmed** (shared selection core now; full `textMap` re-key deferred — see "Central
  design decision").
- **Key vs value are separate concerns.** `idPath` = *where* a piece lives (location identity;
  **never** derived from content). `text` = *what* is in it. Staleness = *same key, different value*.
  The fingerprint is a roll-up of values keyed by `idPath`, sorted by key before hashing → a
  content-hash can never be the key (it would collide on equal text and, worse, change when content
  changes, defeating staleness detection).
- **`idPath` replaces ONLY the positional array/blocks indices with the element `id`** (`+ blockType`
  for blocks). Group/tab/leaf name segments are unchanged; transparent containers add no segment;
  `richText` is a field-level leaf (no per-node segment). `makeIdPath()` is the sole constructor.
- **Same-root-cause as the block fix, but a narrower reach.** `idPath` continues the id-based line
  of `matchElementById` (PR #31) and fixes the **reorder/index-instability** grain for the
  fingerprint (temporal, within one locale). It does **NOT** solve the harder **cross-locale**
  problem — independent *localized* blocks have different ids per locale, so their `idPath`s don't
  correspond across locales; that stays the deferred author-managed-correlation-key feature
  (`2026-06-12-cross-locale-block-identity.md`, "Out of scope"). `idPath` = identity within one tree
  across time, not correspondence across locales.

## Current state (grounded)

The pipeline is 5 ordered stages over a shared mutable `PipelineContext`
(`TranslationPipeline.ts`):

1. **DataReconcilerStage** → `filteredData` (full document shape, source order, target priority).
2. **FieldChunkCollectorStage** → `fieldChunks` (`{ schema, dataRef, key, path }`) **and mutates
   `filteredData`** — `FieldChunkCollector.leaf` writes the source value into the translatable leaf
   (`cursor.data[field.name] = sourceValue`). Read and write are **fused** in this one pass.
3. **TextChunkExpanderStage** → `textChunks` + `textMap: Record<number, string>`. A `richText` field
   expands to **one chunk per Lexical text node**, each carrying a live `nodeRef` into the tree;
   plain text/textarea → one chunk with `dataRef`/`key`. Identity is a sequential **integer index**.
4. **TranslationStage** → `translations: Record<number, string>` from the provider.
5. **TranslationMutatorStage** → writes translations back through the chunk refs
   (`dataRef[key] = …` / `nodeRef.text = …`).

Two structural facts make a shared projection impossible today:

- **Mutation is fused into the read pass** (stage 2). A `ContentProjector` must be read-only, so it
  cannot simply be lifted out of `FieldChunkCollector` — the collector both reads *and* writes.
- **Identity is a positional integer index** (`textMap` keys), order-dependent and meaningless to a
  reorder-stable fingerprint. It is also not surfaced in `PipelineResult`.

## Contracts (core)

```ts
// Branded path — NOT a bare string. Constructed only via makeIdPath() so the grammar is enforced.
type IdPath = string & { readonly __brand: 'IdPath' };

// Pure, read-only. One entry per translatable leaf of the document.
interface ContentProjector {
  project(doc: unknown, schema: FieldLike[]): Array<{ idPath: IdPath; text: string }>;
}

// Stable hash of a projection (sorted by idPath → reorder-invariant). From the provenance design.
interface Fingerprinter {
  hash(projection: Array<{ idPath: IdPath; text: string }>): string;
}
```

### `IdPath` grammar (the reorder-stability mechanism)

A path segment is one of:
- **object key** — a `group` name or named-tab name → the segment is the field `name`.
- **list element** — an `array`/`blocks` element → the segment is the element's **`id`** (NOT its
  positional index), reusing the cross-locale identity rule (`matchElementById`). For `blocks` the
  `blockType` is folded in (`<id>:<blockType>`) so an id collision across types can't alias.
- **leaf** — the translatable field `name`.

Example: `content.<blockId>:hero.heading` instead of `content.0.heading`. Sorting entries by
`idPath` before hashing makes block/array **reorder invisible** to the fingerprint — only real
content change moves the hash (per the fingerprint design discussion).

**Fallback:** an element with no `id` (rare — Payload assigns them) → fall back to positional index
for that segment, and document that reordering *that* element marks it stale. `makeIdPath()` is the
single constructor; nothing else builds an `IdPath` string, so the grammar can't drift.

### RichText granularity (a real decision)

A `richText` field has **no stable per-text-node identity** (Lexical nodes have no durable ids;
editing reflows them). So:

- **Projection / fingerprint granularity = per field.** One `{ idPath, text }` entry per richText
  field, where `text` = the **normalized, joined** text of its nodes (via the existing
  `collectSerializedLexicalTextNodes`). Reordering paragraphs within the field changes that text —
  which is correct (it *is* a content change for translation).
- **Pipeline write granularity stays per node.** Translation still needs per-node chunks to write
  each node back. So the pipeline's apply path keeps node-level handles; only the *projection* is
  field-level. They share the field-level identity + the same node-text extraction, so they agree on
  the translatable set and the text content; they differ only in write granularity.

## Central design decision — how far to refactor the pipeline

Two viable shapes. The doc recommends **B (phased)**.

**A — Full re-key now.** Re-key the whole pipeline onto `IdPath` (replace `textMap:
Record<number,string>` with id-path keys), and split `FieldChunkCollector` into a pure projection +
a separate apply pass. Cleanest end state; but it is a big-bang on the translation hot path, must
prove behavior parity, and re-keying touches stages 2–5 + every pipeline test.

**B — Shared selection core now, full re-key deferred (CONFIRMED 2026-06-30).** The drift risk is in the
**leaf-selection + text-extraction logic**, not the keying. So:
1. Extract a pure `projectTranslatableContent(doc, schema): Array<{ idPath, text }>` built on the
   **same** `walkFields` engine + the **same** predicates (`isTranslatableField`, `isLocalizedField`,
   `isFieldExcludedFromTranslation`) + the **same** text extraction the collector uses. This *is*
   `ContentProjector` — pure, read-only, payload-free.
2. Refactor `FieldChunkCollector` to **build on that same selection core** (so the chunk set and the
   projection are derived from one definition of "translatable leaf"), while keeping its existing
   write-handles for apply. The fused mutation moves to a small explicit step, not inside the read
   walk.
3. Add a **drift-guard test**: for a fixture document, the projection's leaf set + texts equal what
   the collector/expander would translate. Makes "they agree" executable.
4. Leave the pipeline's internal `textMap` integer keying as-is for now (it's an internal detail of
   apply; re-keying it onto `IdPath` is deferred until something needs it — likely never for
   correctness, since agreement is guaranteed by the shared selection core).

B unblocks the provenance fingerprint immediately with far less hot-path risk; A's full re-key
becomes optional cleanup, not a prerequisite.

## Companion — split the `shared/index.ts` barrel (the real core blocker)

The edge investigation found core-bound files (`FieldChunkCollector`, `DataReconciler`, strategies,
`OpenAITranslation.provider`) import the `src/server/shared` **barrel**, which re-exports
`withErrorHandler` → `import { APIError } from "payload"` (a **runtime** import). Moving the pipeline
to core would drag payload transitively.

Since slice 6 refactors `FieldChunkCollector` anyway, do the fix here:
- point the core-bound files at the **leaf** modules directly (`shared/utils`, `shared/guards`,
  `shared/lexical`, `shared/field-config`) instead of the barrel; **or**
- split the barrel so the payload-runtime pieces (`http`/`access`) sit behind a separate entrypoint.

Then extend the slice-5 oxlint boundary to cover `translation-pipeline/**` + `translation-providers/**`
once they're barrel-free, so the guard catches regressions before the slice-7 move.

## Revise provenance phase 2

Update `2026-06-26-translation-provenance-and-lifecycle-design.md`:
- The fingerprint consumes `ContentProjector.project(...)` (option B above) — confirmed feasible, not
  hypothetical.
- `idPath` is the branded type with the grammar defined here.
- `CURRENT` = `Fingerprinter.hash(ContentProjector.project(sourceDoc, schema))`, computed lazily on
  read (slice unchanged), or at write-time later if dashboard perf demands.

## Sequencing & risk

1. Define `IdPath` + `makeIdPath()` + grammar tests.
2. Extract `projectTranslatableContent` (= `ContentProjector`) on the shared walk; unit-test it
   (incl. reorder-invariance + richText field-level text).
3. Refactor `FieldChunkCollector` onto the shared selection core; drift-guard test; un-fuse mutation.
4. Barrel fix for the touched core-bound files; extend the oxlint boundary.
5. `Fingerprinter` (hash over sorted projection) — small; may move with provenance.

Risk: medium — step 3 touches the translation hot path. Guarded by the full existing pipeline suite
(behavior parity) + the new drift-guard test. No public API change (the projector/fingerprinter are
internal until provenance ships them).

## Open questions

1. **Text normalization for hashing** — exact normalization of leaf values + joined richText text
   (whitespace, Lexical structure) so re-saves without content change don't move the hash. Shared by
   translation and fingerprint.
2. **`makeIdPath` encoding** — separator char, escaping of names/ids containing the separator,
   `blockType` folding format.
3. **Where `ContentProjector`/`IdPath` live** — `server/shared/` now, destined for
   `@repo/translator-core` in slice 7. Keep them payload-free from day one (FieldLike-based).
4. **Full re-key (option A)** — schedule it, or drop it as unnecessary once B guarantees agreement?

## Out of scope

- The provenance sidecar collection, lifecycle callbacks, staleness UI — that's #47 / #50 (separate).
- Creating the `@repo/translator-core` package and moving files — slice 7.
- Re-keying the pipeline's internal `textMap` onto `IdPath` (option A) unless a concrete need appears.
