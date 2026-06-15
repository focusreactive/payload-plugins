# Translation Levels — Phase 2: Field-level server (design)

**Date:** 2026-06-10
**Status:** Ready — all decisions resolved (D1–D4 + allowlist below)
**Plan:** [translation-levels-plan](./2026-06-08-translation-levels-plan.md) · **Phase 1 design:** [translation-levels-phase1-design](./2026-06-09-translation-levels-phase1-design.md) · **Groundwork:** `translateContent()` (0b)

Phase 2 adds the **field-level server**: a `fieldLevel({ mode: 'in-place' })` level that
contributes one synchronous endpoint, `POST {basePath}/field`. The endpoint translates a
single declared field's current value into a target locale via `translateContent` (0b) and
returns it — **no DB, no document, no persistence**. The per-field control UI that calls it
is Phase 3 (`withFieldTranslation(field, { control: true })`); this phase is server-only and
independently testable.

## What's already settled (don't re-litigate)

From the Phase 1 design + plan:

- `fieldLevel` needs **no runner and no admin component** — it is request → response. Its UI
  attaches per-field (Phase 3), not per-collection.
- It contributes its own endpoint via the generic primitive: `ctx.addEndpoints([createFieldRoute(...)])`.
- `LevelContext` gains `readonly schemaMap` + `readonly translationProvider` (anticipated in the
  Phase 1 design; trimmed from the Phase 1 _implementation_ as YAGNI). Additive, `@internal` → non-breaking.
- Only `localized` text/richText leaves translate; everything else reconciles through unchanged
  (that is `translateContent`'s existing behaviour — Phase 2 adds no translation logic).

## The endpoint contract

`POST {basePath}/field`

Request body:

```jsonc
// snake_case to match the other translator routes
{
  "collection_slug": "posts", // must be a managed collection
  "field_path": "hero.title", // declared field path (see resolver below)
  "value": "Hello world", // the field's current (unsaved) value — any shape the field holds
  "target_lng": "de", // required
  "source_lng": "", // optional; "" = provider auto-detect (default)
  "strategy": "overwrite", // optional; default "overwrite"
}
```

Response `200` — a discriminated result, never an error for "couldn't translate":

```ts
type FieldTranslationResult =
  | { status: "translated"; value: unknown } // value = translated, same shape as input
  | { status: "noop"; value: unknown; notice: { level: "info" | "warning"; message: string } };
```

- `translated` — the field had localized content; `value` is the translation.
- `noop` — nothing was translated; `value` echoes the input unchanged and `notice` says why
  (`info` "Nothing to translate in this field"; `warning` "Translating fields inside blocks isn't
  supported yet"). The client shows a calm toast, not an error.

**Errors stay for genuine errors only** (D3):

| Code          | When                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `200`         | translated, **or** `noop` (nothing localized / path through `blocks` — limitation, not a user error) |
| `400`         | malformed body / unknown `collectionSlug` / `fieldPath` resolves to **no field at all** (typo)       |
| `401` / `403` | `AccessGuard` denied (same wiring as the 6 doc routes)                                               |
| `413`         | `value` exceeds the size cap (see D4)                                                                |

The endpoint reuses the existing access + error-envelope plumbing (`AnyAccessGuard`,
`ServerResponse`) so its behaviour matches the doc-translation routes.

## The subtree resolver (the piece deferred from 0b)

`resolveFieldSubtree(fields: Field[], fieldPath: string, value: unknown)` →
`{ schema: Field[], sourceData: Record<string, unknown> }` or a typed failure.

It maps a **declared field path** to the inputs `translateContent` wants:

1. Look up `fields = schemaMap.get(collectionSlug)`; unknown slug → fail.
2. Split `fieldPath` on `.`; **drop purely-numeric segments** (array indices) — a field's
   _config_ is shared across array items, so `items.0.heading` and `items.3.heading` resolve to
   the same `heading` config. The index only told us which runtime value the client grabbed.
3. Walk the remaining named segments through the schema, **descending transparently** through
   presentational containers that carry no path segment: `row`, `collapsible`, and **unnamed**
   `tabs`. Named `group` / named tab / `array` consume one segment and we descend into their
   `.fields`.
4. The final segment must resolve to a **translatable leaf** — a `TranslatableField`
   (`text | textarea | richText`; see the field-type constraint below). If it resolves to no
   field at all (typo) → `400`. If it resolves to a non-translatable field → `noop` + `info`.
5. Return `schema = [resolvedField]`, `sourceData = { [resolvedField.name]: value }`.
   The response unwraps `result[resolvedField.name]` back to `{ value }`.

A path that resolves to **no field** is the only resolver `400` — it means the client sent a
typo. "Resolves to something we can't translate" is a `noop`, not an error (D3).

**Scope (Decision D1):** the resolver descends through groups, named/unnamed tabs,
rows/collapsibles, and arrays (index-stripped) to reach the wrapped leaf. **A path that descends
through a `blocks` field → `noop` + `warning`** ("not supported yet"). Blocks are polymorphic
(`blockType` in the _data_ decides which subschema applies); the resolver gets only `fieldPath` +
the leaf `value`, never the surrounding block instance, so it cannot pick the block variant from
the path alone — and the value the client _does_ have (the unsaved form) can't be re-fetched from
the DB without breaking the "translate the current unsaved value" contract. Lifting this (thread
`blockType` in the request) is a Phase 4 follow-up, alongside richText write-back.

> **Considered alternative — resolve by a stable field id instead of a path.** Phase 3's
> `withFieldTranslation` wrapper could stamp each translatable field with a unique marker and the
> server could resolve by a flat scan, sidestepping indices/blocks/presentational nesting
> entirely. Rejected for Phase 2: it couples the server contract to the Phase 3 wrapper (which
> doesn't exist yet) and the plan fixes the request shape on `fieldPath`. Revisit if path
> resolution proves brittle in practice.

## `fieldLevel` factory + context additions

```ts
type FieldLevelOptions = { mode: "in-place" }; // only mode in Phase 2

function fieldLevel(options: FieldLevelOptions): TranslationLevel {
  return {
    extend(ctx) {
      ctx.addEndpoints([
        createFieldRoute({
          schemaMap: ctx.schemaMap,
          translationProvider: ctx.translationProvider,
          access: ctx.access,
          basePath: ctx.basePath,
        }),
      ]);
      // Per-field control UI is wired separately at field declaration time via
      // withFieldTranslation(field, { control: true }) — Phase 3, not here.
    },
  };
}
```

`LevelContext` (and `PluginConfigBuilder`'s deps) gain:

```ts
readonly schemaMap: CollectionSchemaMap;          // slug -> localized field schema (already built in plugin.ts)
readonly translationProvider: TranslationProvider;
```

`plugin.ts` already builds `schemaMap` and holds `translationProvider`; it passes both into the
builder. `documentLevel` / `collectionLevel` ignore them — no change to those levels.

`fieldLevel` is **not** in the default `levels` array — it stays opt-in
(`levels: [documentLevel(), collectionLevel(), fieldLevel({ mode: "in-place" })]`), so Phase 2
is non-breaking.

## Field-type constraint (one allowlist, type + runtime)

What may carry a field-level translate control is the existing
`TranslatableField = TextField | TextareaField | RichTextField` (`server/shared/guards`) — the
same type the pipeline already keys on via `isTranslatableField`. **One source of truth, reused —
no parallel list.** Decision (allowlist): **leaves only.** A control is attached to a concrete
text-like leaf; the resolver still descends through containers (group/array/tab) to _reach_ it,
but the wrapped field itself is a leaf. (Whole-section / container controls are a possible later
enhancement — they shade toward mini-document translation, not "one field".)

This is enforced in two complementary places:

- **Compile time (Phase 3, the wrapper).** `withFieldTranslation`'s control variant constrains the
  field to `TranslatableField`; the `exclude` variant still accepts any `Field` (you can exclude
  anything). Via overloads:

  ```ts
  function withFieldTranslation<T extends TranslatableField>(field: T, config: ControlConfig): T;
  function withFieldTranslation<T extends Field>(field: T, config: ExcludeConfig): T;
  ```

  So `withFieldTranslation({ type: "number", ... }, { control: true })` is a **compile error**, and
  `blocks` / `group` / `relationship` / … are excluded by construction.

- **Runtime (Phase 2, the resolver).** Mirrors the same allowlist: a resolved field that is not a
  `TranslatableField` → `noop` + `info`.

**What types can and cannot express.** Types catch "wrapped a field that never holds text"
(`number`, `relationship`, `blocks`, …) at compile time. They **cannot** catch "a text leaf
declared _inside_ a block definition" — that is _positional_ (a field config has no handle on its
parent), so a `text` inside a block passes the type check but hits the blocks limitation at
runtime → `noop` + `warning`. Type allowlist and runtime resolver thus close _different_ gaps,
keyed on the _same_ `TranslatableField`.

## Security

- **Access:** wrap the handler in `AnyAccessGuard(ctx.access)` exactly like the doc routes.
- **Field validation:** the resolver _is_ the validation — an unresolvable path can never reach
  `translateContent`; a non-translatable resolved field is a `noop`, not an error.
- **Size cap (Decision D4):** reject a `value` whose serialized size exceeds **64 KB** with `413`.
  A sync endpoint holds a request for the whole translation, so an unbounded payload is a DoS
  surface. Fixed constant for the MVP; a config knob can come later if anyone needs it.

## Decisions (resolved)

- **D1 — resolver scope.** Descend through groups + named/unnamed tabs + rows/collapsibles + arrays
  (index-stripped) to the wrapped leaf; **a path through `blocks` → `noop` + `warning`** (deferred
  to Phase 4). ✅
- **D2 — source language.** Defaults to `""` (provider auto-detect); `sourceLng` accepted but
  optional. ✅
- **D3 — nothing translatable.** **Not an error.** `200` with `status: "noop"` + an `info`/`warning`
  notice, value echoed unchanged. HTTP errors are reserved for malformed/unauthorized/unresolvable
  requests. ✅
- **D4 — size cap.** Fixed 64 KB → `413`, not yet configurable. ✅
- **Allowlist.** Leaves only — `TranslatableField` (`text | textarea | richText`), reused as the
  single source of truth; `withFieldTranslation` control overload + runtime resolver both key on it. ✅

## File layout

Mirror the existing per-feature convention (`server/features/translate-document/`):

```
server/features/translate-field/
  model.ts               # request/response types
  resolveFieldSubtree.ts # the resolver (+ unit tests)
  handler.ts             # validation + translateContent call (+ unit tests)
  route.ts → createFieldRoute(...)  # endpoint wiring (+ contract test, like 0a)
server/modules/translation-levels/
  fieldLevel.ts          # the factory (+ unit test asserting it calls addEndpoints once)
  types.ts               # LevelContext += schemaMap, translationProvider
  PluginConfigBuilder.ts # deps += schemaMap, translationProvider
```

## Tests

- **Resolver:** top-level leaf; nested under group; under named + unnamed tab; under array
  (`items.0.heading` → `heading` config + `{ heading: value }`); through row/collapsible;
  unresolvable path → `400`; path through blocks → blocks-limitation signal; resolved field
  not a `TranslatableField` → non-translatable signal.
- **Handler:** localized leaf → `translated`; non-localized leaf → `noop` + `info`; blocks path →
  `noop` + `warning`; auto-detect source (`sourceLng: ""`); strategy passthrough.
- **Route (contract, like 0a):** path + method `POST {basePath}/field`; access guard wired;
  oversized body → `413`; unknown collection → `400`; typo path → `400`; `noop` cases stay `200`.

## Out of scope (later phases / follow-ups)

- **Phase 3:** the per-field control UI (`withFieldTranslation(field, { control: true })`) +
  form-state write-back.
- **Phase 4:** `blocks` paths (thread `blockType`); richText write-back into Lexical state;
  `from-locale` mode (source picker); non-localized "translate this content" utility.

## Release shape

`feat` (minor) — the field level is opt-in via `levels`. Non-breaking. `@since` = the next minor
after whatever Phase 1 (0.5.0) releases at (determine deterministically / `--dry-run` at ship time).
