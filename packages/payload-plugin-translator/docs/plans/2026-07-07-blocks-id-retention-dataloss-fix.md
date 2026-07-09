# Blocks/array `id` retention — critical data-loss fix

**Date:** 2026-07-07
**Type:** `fix:` (patch). **Severity:** CRITICAL — silent source-content data loss.
**Scope:** `DataReconciler` output only. No public API change, no `@since`. Corrects a decision in
[`2026-06-12-cross-locale-block-identity.md`](./2026-06-12-cross-locale-block-identity.md).

## Symptom

Translating a whole document **erases the source-locale content** inside a **non-localized**
`blocks`/`array` container (the recommended regime: non-localized container, localized leaves — e.g.
`apps/dev` `Playground.layout` + `DeepNest`). After translating `en → de`, the `en` blocks come back
empty and the block `id` has changed.

## Root cause

`DataReconciler` (`src/core/translation-pipeline/stages/data-reconciler/DataReconciler.ts`)
**unconditionally stripped `id`** from every array/block element on output (`combine`, kind
`"element"`), justified by a comment "Postgres rejects it on update".

The reconciler output is saved via `payload.update({ locale: targetLng, data })`. For a
**non-localized** container the array rows are **shared across locales** (one row, per-locale leaf
columns). Without `id`, Payload cannot match the existing shared rows on that update, so it
**deletes and recreates** them — and the recreated rows only carry the target locale's values, so
**every other locale's leaf values (the source) are destroyed.**

The "Postgres rejects id" premise was a **misdiagnosis**: the reject only happens for a **localized**
container, where each element is an independent **per-locale** row and re-sending the source row's
`id` collides on insert. The fix over-generalized that strip to all containers, breaking the
non-localized (shared-row) case.

### Verified on a live DB (SQLite + Postgres), both adapters identical

| container | current (strip id) | fix (conditional id) |
| --- | --- | --- |
| **non-localized** blocks/array (shared rows) | ✗ EN source **wiped**, block id changes | ✓ EN survives, DE translated, id stable (in-place update) |
| **localized** container (per-locale rows) | ✓ correct | ✓ correct (still stripped — keeping id collides on insert, confirmed) |

## The rule

Keep `id` **iff the element's row is shared across locales** — i.e. neither the container nor any
ancestor is `localized`. Strip it otherwise (per-locale rows).

- **Shared row** (no `localized` on the path) → Payload stores one row with per-locale leaf columns;
  `id` is a stable cross-locale key → **keep it** so `update({ locale })` matches and updates in place.
- **Per-locale row** (`localized` container or any `localized` ancestor group/blocks/array/tab) →
  independent rows per locale → **strip** `id` (re-sending the source id would collide on insert).

## Implementation

Thread a `sharedRow: boolean` through the reconcile walker `Cursor` (root `true`):

- `enterObject` / `enterList`: `childShared = cursor.sharedRow && !field.localized` — a `localized`
  group/tab/array/blocks flips the whole subtree to per-locale.
- `combine` (kind `"element"`): `if (cursor.sharedRow && cursor.source.id != null) result.id = cursor.source.id`.
  Guard against `id: undefined` when a shared element genuinely has no id.

`matchElementById` is untouched — it reads `id` from the intact **source**, so target pairing is
unaffected. The `localized` flag reaches the reconciler because it walks the **original**
(un-sanitized) schema, which preserves `localized`.

## Tests (regression / data-loss guard, red-first)

Fast reconciler unit tests on the output shape (`DataReconciler.test.ts`, describe
"id retention by shared-vs-per-locale row (data-loss guard)"):

1. non-localized blocks → `id` **kept** (the bug). ← main guard
2. non-localized array → `id` **kept**.
3. localized blocks container → `id` **stripped**.
4. localized array container → `id` **stripped**.
5. non-localized array nested under a **localized** blocks ancestor → `id` **stripped**.
6. non-localized under a **localized group** ancestor → `id` **stripped**.
7. non-localized under a **localized named-tab** ancestor → `id` **stripped**.
8. deeply-nested all-non-localized (Playground `layout → nested → leaves`) → `id` kept at every level.
9. shared element with no id → **no `id` key** added (guard against `id: undefined`).
10. non-localized blocks **with an existing target** → `id` kept + target-priority merge.
11. unknown-`blockType` passthrough element → `id` kept (shared) / stripped (per-locale).

Pre-existing reconciler/pipeline tests that asserted stripped id for **non-localized** fixtures were
corrected to expect `id`; the "cross-locale block identity" fixtures were marked `localized: true`
(they model per-locale independent blocks — the only regime where reordering / diverging ids occur),
so their stripped-id expectations stay correct.

## Out of scope / notes

- Cross-DB behaviour confirmed by a local-API reproduction on SQLite and Postgres (both wiped before,
  both correct after). No new automated DB test harness is added in this patch — the reconciler-output
  contract is the fast, deterministic guard.
- No change to fingerprint/provenance (they use the id-path projection, not the reconciler output).
