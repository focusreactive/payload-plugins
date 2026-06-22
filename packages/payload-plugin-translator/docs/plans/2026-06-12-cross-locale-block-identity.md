# Cross-locale block identity — design

**Date:** 2026-06-12
**Status:** Document-level fix implemented (this patch) — `DataReconciler` + `FieldChunkCollector` both pair by `id` via a shared `matchElementById` helper; field-level guard pending (ships with the field-level feature).
**Scope:** Internal behaviour of `blocks`/`array` reconciliation + chunk collection across locales, plus a documented support boundary for both the document level and the upcoming field level. No public API change, no `@since`.

## The problem

A `blocks` (or `array`) field can be declared **`localized: true`**. Payload then stores an
**independent array per locale**: the locales can have a different order, a different count, even
different block types. There is no built-in identifier that links "this `fr` block" to "that `en`
block" — localized arrays/blocks are independent partitions by design, and you cannot store a
shared (non-localized) correlation key _inside_ a localized field, because the whole subtree is
locale-partitioned.

This breaks every attempt to translate **between** locales, because translation needs to know
which target element corresponds to which source element. Three call sites hit it — two in the
document-level pipeline, one in the field level:

- **Document level — `DataReconciler`** merges source-locale data with the existing target-locale
  data to produce the full document shape for saving. It paired array/block elements **by
  position** (`target[index]`). When the target locale's blocks were reordered or different, each
  source block was merged with an unrelated target block: values from one block leaked into
  another, and `blockType` came from source while values came from a different block. This is the
  "blocks don't line up across locales" bug.
- **Document level — `FieldChunkCollector`** decides _what gets sent to the translator_. It paired
  `target` by position too, feeding the wrong element's value into `strategy.shouldTranslate`.
  Under `skip_existing` with reordered blocks that meant **silently skipping** a block that had no
  translation (a different, populated block sat at its index) or **re-translating** one that was
  already done — arguably worse than the reconciler symptom, since the field never enters the
  chunk list at all.
- **Field level** (per-field translate control, separate feature) — resolves a field by its
  indexed `path` and reads the **same** path from the source-locale document. Under a localized
  `blocks`/`array` ancestor, `path` index N in the target locale need not be the same element as
  index N in the source locale → it pulls a different block's value.

Same root cause, three sites.

## Why no signal can auto-match independent localized blocks

| Candidate                   | Why it fails                                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Position / index**        | The premise is that the locales were reordered.                                                                                                                                                      |
| **Block `id`**              | For a _localized_ field the per-locale rows get independent ids; they don't correspond. (For a _non-localized_ field there is one shared row → the id **is** a stable cross-locale key — see below.) |
| **Block type**              | Ambiguous: three `Copy` blocks → which maps to which?                                                                                                                                                |
| **"Same path has a field"** | Coincidence; different block types can share a field name at the same path and get silently overwritten.                                                                                             |
| **Content similarity**      | Circular for translation: the target value is either empty (nothing to compare) or already in another language (nothing to find).                                                                    |

Conclusion: **independent localized blocks cannot be auto-matched reliably.** The honest product
move is to constrain to the regime where identity is well-defined, and to refuse rather than
silently corrupt outside it.

## Decisions

### 1. Supported regime: localize the leaves, not the container

The recommended (and only fully-correct) shape is a **non-localized** `blocks`/`array` with
**localized leaf fields** inside it:

- The structure is shared across locales (one array, one set of ids, one order).
- Only leaf **values** differ per locale.
- Identity = position = shared `id`; matching is exact for both the reconciler and the field level.
- The user's "reorder per locale" scenario is impossible by construction — reordering is global,
  which is correct for _translation_ (translating should not restructure the page).

If different layouts per locale are genuinely required, that is authoring, not translation, and
"pull a translation from another locale" is not a well-defined operation for those blocks.

### 2. Document-level pipeline: match by `id`, not position (this patch)

Both multi-tree pipeline sites now pair their `target` array against the source/reference element
by **`id`** (and, for blocks, the same `blockType`) instead of by position, through one shared
helper `matchElementById` in `shared/field-traversal` (sibling of `resolveBlockFields`). No match →
empty target → the source value fills in. The helper lives in the shared engine because the
positional bug was duplicated across both sites; the `walkFields` engine itself stays
data-agnostic (it never reads the cursor), so the pairing is a caller-side helper, not an engine
change.

- **`DataReconciler`** iterates `source` and matches each element to the target by id. Output order
  always follows source.
- **`FieldChunkCollector`** iterates `filteredData` (the reconciler's output: source order, `id`
  stripped). Its `source` still pairs by position — `filteredData` shares source order 1:1 — but
  the `id` to match the target with is read off that source element. So `shouldTranslate` now sees
  the correct target value even when the target locale is reordered.

| Field shape                                                             | Source/target ids                | Behaviour                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Non-localized blocks/array (leaves localized)                           | Shared (same row across locales) | id-match == old positional match → **unchanged**, and now robust to any ordering.                                      |
| Localized blocks/array, reordered, ids preserved (e.g. fallback-seeded) | Correspond                       | Correct element paired regardless of order (was the bug).                                                              |
| Localized blocks/array, independently authored                          | Diverge                          | No match → mirror source instead of grafting a different block's values (was silent corruption / wrong skip decision). |
| Same id, different `blockType`                                          | —                                | Not the same block → no merge → source fills.                                                                          |

**Honest limit:** this removes the _corruption / wrong skip_, but it does not make `skip_existing`
preserve per-block target edits for genuinely-independent localized blocks — there is no identity to
preserve them by, and the reconciler strips `id` on output (Postgres rejects it on update) so a
re-translated target gets fresh ids anyway. For independent localized blocks, re-translation
effectively re-mirrors source. That is the correct, consistent behaviour given no identity.

### 3. Field level: guard, don't pretend (ships with the field-level feature)

When a field's `path` crosses any **localized** `blocks`/`array` ancestor, the per-field translate
endpoint returns a `noop` with a notice ("this field lives inside a localized block — its position
may not match the source locale; translate at the document level") instead of resolving the source
value positionally. Pure `schemaMap` check, no extra DB round-trip. Implemented alongside the
field-level feature (minor), not in this patch.

## Out of scope

- **Author-managed correlation key** for the genuine "different layout per locale + translate
  between them" case. Requires the author to maintain a matching key by hand in each locale (it
  cannot live inside the localized field automatically). Only worth building against a concrete
  demand; deferred.
