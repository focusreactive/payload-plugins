# Task — Replace the `schemaMap` JSON round-trip with a typed `FieldLike` projection

**Date:** 2026-07-15 · **implemented:** 2026-07-17 (after the core/ layering redesign).
**Status:** implemented. Preceded by a read-only code investigation that de-risked the property
contract, the Payload-sanitize premise, and placement (findings folded in below).
**Scope:** internal only — no public API change. Ships as `refactor:` (patch).

## Problem

`plugin.ts` `init()` builds the per-collection field schema the pipeline needs by **deep-cloning**
the collections' fields via a JSON round-trip:

```ts
const schemaMap = new Map(
  collections.map((col) => [col.slug, JSON.parse(JSON.stringify(col.fields))])
);
```

Two reasons the clone exists at all:

1. **Escape Payload's mutation.** Payload's sanitization mutates the original collection objects,
   stripping `localized: true` from nested fields. The pipeline needs the *original* schema (with
   `localized` intact at every depth) to know what to translate, so it must snapshot the fields
   before Payload touches them.
2. **`structuredClone` can't be used.** Lexical editor configs embedded in field definitions contain
   async functions, which `structuredClone` throws on. The JSON round-trip silently drops functions,
   which "works" only because the pipeline reads just a few plain properties.

### Why this is debt

- **Lossy + implicit contract.** JSON round-trip discards everything non-serializable (functions,
  `undefined`, dates, class instances). Nothing declares which properties the pipeline actually
  depends on, so a future read of a dropped property fails silently.
- **Type erosion.** `JSON.parse(...)` returns `any`; `schemaMap` is typed by assertion, not by
  checking, at this boundary.

## Proposed change

Introduce a typed, recursive projector `Field[] → FieldLike[]` that deep-copies **only** the
properties the pipeline uses (`name`, `type`, `localized`, `fields`, `blocks`, `tabs`, `custom`) at
every nesting level, and build `schemaMap` from it instead of the JSON round-trip. This makes the
schema contract explicit and typed.

`FieldLike` already exists in `core/kernel/field-traversal` (post-refactor location) and the pipeline
already operates on it — the gap is only the `schemaMap` construction in `plugin.ts`.

## Findings from the pre-implementation investigation (evidence-based)

- **Contract is complete but `blocks`/`tabs` are not scalars.** Every `schemaMap` consumer (pipeline,
  provenance fingerprint, auto-translate drift gate, field-path resolver) reads only
  `type` · `name` · `localized` · `custom` (just `custom.translateKit.exclude`) · `fields` · `blocks` ·
  `tabs`. Nothing else is read (`editor`/`admin`/`relationTo`/`validate` — none; `relationTo` appears only
  in dead code). BUT the projector must recurse into sub-shapes: **`block.slug` is load-bearing**
  (block-type dispatch) and `tab.name`/`tab.fields` (+`tab.localized`) are required — copying `blocks`/`tabs`
  opaquely would silently break translation. This corrected the doc's original flat property list.
- **Premise confirmed in Payload source.** `sanitizeFields` does `delete field.localized` **in place** on
  any field under a localized ancestor (propagated via `parentIsLocalized`). The pipeline reads per-field
  `localized` (no inherited computation), so a **deep** pre-sanitize copy is mandatory — a shared reference
  re-introduces the silent no-translate bug.
- **richText needs no schema data.** The lexical config lives in `field.editor` (async functions), but the
  pipeline reads the lexical tree from the **document value** at runtime, never from the field schema — so
  dropping `editor` (and all functions) is safe. This is exactly why `structuredClone` was impossible and
  the projection is sound.
- **Placement without breaking payload-free core.** The projector is a pure `FieldLike[] → FieldLike[]`
  deep copy living in `core/kernel/field-traversal/projectFieldLike.ts` — it never imports Payload. The
  `Field[] → FieldLike[]` assignment happens at the call site in `plugin.ts` (where Payload types are
  legal), since Payload's `Field` is structurally assignable to `FieldLike`. `custom` is copied by
  reference (passthrough bag Payload never mutates; deep-copying it would hit the same function problem).

## Risk / why it's a separate task

This is content-projection work with a real data-correctness trap, not cosmetics:

- The projection must be a **deep** copy made **before** Payload sanitizes; a shallow or partial
  projection can retain references into the objects Payload later mutates, which would re-introduce
  the exact `localized`-stripping bug — a translated field would silently stop being translated.
- The recursion must cover every container that can nest fields: `group`, `array`, `blocks[]`, named
  and unnamed `tabs`, `row`, `collapsible` — plus `custom`.

## Acceptance criteria

- [x] A typed `FieldLike[] → FieldLike[]` projector (`projectFieldsToFieldLike`) replaces the JSON
      round-trip in `plugin.ts` (Payload's `Field[]` assigns structurally at the call site).
- [x] `localized: true` is preserved on deeply-nested fields across group / array / blocks / named &
      unnamed tabs / row / collapsible (copied by value at projection time).
- [x] The projected schema is an independent deep copy — regression test simulates Payload's in-place
      `delete field.localized` on the source and asserts the projection is unaffected.
- [x] `schemaMap` (`CollectionSchemaMap`) is typed as `FieldLike[]` (no `any` at the boundary); the two
      internal consumers that annotated `Field[]` (`resolveFieldSubtree`, `Provenance.service`) retyped to `FieldLike[]`.
- [x] Type-check + lint clean (repo baseline, no new warnings); full suite green.

## References

- `src/plugin.ts` — the JSON round-trip (now `projectFieldsToFieldLike`).
- `src/core/kernel/field-traversal/projectFieldLike.ts` (+ `.test.ts`) — the projector + regression test.
- `src/core/kernel/field-traversal/` — existing `FieldLike` types the projection produces.
