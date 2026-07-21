# Task — Replace the `schemaMap` JSON round-trip with a typed `FieldLike` projection

**Date:** 2026-07-15
**Status:** backlog (internal). Deferred out of the `TranslateCollectionPlugin` reshape
(`2026-07-14-translate-collection-plugin-reshape.md`) as a separate, test-backed task.
**Scope:** internal only — no public API change.

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

`FieldLike` already exists in `core/field-traversal` (see `fieldLike.types.test.ts`) and the pipeline
already operates on it — the gap is only the `schemaMap` construction in `plugin.ts`.

## Risk / why it's a separate task

This is content-projection work with a real data-correctness trap, not cosmetics:

- The projection must be a **deep** copy made **before** Payload sanitizes; a shallow or partial
  projection can retain references into the objects Payload later mutates, which would re-introduce
  the exact `localized`-stripping bug — a translated field would silently stop being translated.
- The recursion must cover every container that can nest fields: `group`, `array`, `blocks[]`, named
  and unnamed `tabs`, `row`, `collapsible` — plus `custom`.

## Acceptance criteria

- [ ] A typed `Field[] → FieldLike[]` projector replaces the JSON round-trip in `plugin.ts`.
- [ ] `localized: true` is preserved on deeply-nested fields across group / array / blocks / named &
      unnamed tabs / row / collapsible.
- [ ] The projected schema is an independent deep copy — unaffected by later mutation of the source
      collection objects (regression test simulating Payload's `localized` stripping).
- [ ] `schemaMap` is typed as `FieldLike[]` (no `any` at the boundary).
- [ ] Type-check + lint clean; existing translation/staleness tests unchanged and green.

## References

- `src/plugin.ts` — the `TODO` next to `schemaMap` marks this.
- `src/core/field-traversal/` — existing `FieldLike` + traversal walkers to reuse.
