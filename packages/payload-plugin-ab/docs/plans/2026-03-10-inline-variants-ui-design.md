# Inline Variants UI Design

**Date:** 2026-03-10
**Status:** Approved

## Overview

Replace the separate `page-variants` collection with inline variant documents living in the same parent collection. The plugin auto-injects all fields, UI components, hooks, and a custom endpoint — zero extra config required from the user.

## Problem

- No way to see how many variants a page has from the admin UI
- No button to create a variant from the page itself
- Separate variant collection clutters the sidebar
- Users must manually create duplicate pages and wire up the relationship

## Solution

Variants are regular documents in the parent collection (e.g. `pages`) distinguished by an injected `_abVariantOf` relationship field. The plugin injects everything automatically.

```
Parent collection (e.g. "pages")
├── original doc  (slug: "about",       _abVariantOf: null)
├── variant A     (slug: "about--4ji9", _abVariantOf: <original id>)
└── variant B     (slug: "about--x2k1", _abVariantOf: <original id>)
```

## Injected Fields & UI

The plugin patches every configured parent collection with:

| Field               | Type                  | Purpose                                                             |
| ------------------- | --------------------- | ------------------------------------------------------------------- |
| `_abVariantOf`      | `relationship` (self) | Marks a doc as a variant. Hidden everywhere.                        |
| `_abPassPercentage` | `number`              | Traffic weight 0–100. Hidden in list, shown in Variants panel only. |
| `_abVariants`       | `ui`                  | Variants panel — shown on original pages (`_abVariantOf` is empty)  |
| `_abVariantOfBadge` | `ui`                  | "Variant Of" badge — shown on variant pages (`_abVariantOf` is set) |

Variants are hidden from the collection list view via:

```ts
admin.baseListFilter: () => ({ _abVariantOf: { exists: false } })
```

`slug` and `tenantField` (if configured) are patched to `admin.readOnly: true` on variant documents so editors cannot accidentally break routing or tenant scoping.

## "Add Variant" Flow

1. User clicks **"+ Add new"** in the Variants panel on an original page
2. UI calls `POST /api/_ab/duplicate` with `{ collectionSlug, docId }`
3. Server endpoint:
   - Fetches the parent doc at depth 0
   - Strips `id`, `createdAt`, `updatedAt`, `_abVariantOf`, `_abPassPercentage`
   - Generates new slug: `{original-slug}--{nanoid(6)}`
   - Sets `_abVariantOf = parentId`, `_abPassPercentage = 0`
   - Creates the new doc via `payload.create()`
4. UI refreshes the variants list, shows **"Variant created"** toast

## Config Changes

`CollectionABConfig` simplifies — `variantCollectionSlug`, `parentField`, and `passPercentageField` are removed:

```ts
interface CollectionABConfig<TVariantData> {
  slugField?: string; // default: 'slug' — used to generate cloned slug
  tenantField?: string; // if set, also locked read-only on variant pages
  generatePath: (args: {
    doc: Record<string, unknown>;
    locale: string | undefined;
  }) => string | null;
  generateVariantData?: (args: {
    doc: Record<string, unknown>;
    variantDoc: Record<string, unknown>;
    locale: string | undefined;
  }) => TVariantData;
  // if generateVariantData is omitted, auto-generates:
  // { bucket: variantSlug, rewritePath: generatePath(variantDoc, locale), passPercentage: _abPassPercentage }
}
```

## Hooks

Hooks move from the variant collection to the parent collection. `afterChange` and `afterDelete` fire on all parent collection docs and check `_abVariantOf` to decide whether to recompute the manifest:

- Doc has `_abVariantOf` set → it's a variant → recompute manifest for the parent page
- Doc has no `_abVariantOf` → it's an original → recompute manifest for this page (to pick up any changes that affect all variant rewrite paths)

## Custom Endpoint

`POST /api/_ab/duplicate`

Registered by the plugin on the Payload Express router.

**Request body:**

```json
{ "collectionSlug": "pages", "docId": "abc123" }
```

**Response:**

```json
{ "id": "xyz789", "slug": "about--4ji9" }
```

**Error responses:**

- `400` — missing/invalid body
- `404` — parent doc not found
- `500` — creation failed

## Variants Panel UI

The `_abVariants` React component (client component):

- On mount: fetches `GET /api/{collectionSlug}?where[_abVariantOf][equals]={docId}&limit=100`
- Renders each variant as a row:
  - **Title / slug**
  - **% input** (0–100, calls `PATCH /api/{collectionSlug}/{variantId}` with `{ _abPassPercentage }` on blur)
  - **External link icon** → opens `/admin/collections/{collectionSlug}/{variantId}` in new tab
  - **× button** → deletes variant doc, refreshes list
- **"Clear All"** link → deletes all variants after confirmation
- **"+ Add new"** button → calls duplicate endpoint, shows "Variant created" toast, refreshes list
- Condition: only rendered when `data._abVariantOf` is falsy (i.e. this is an original page)

## Variant Of Badge

The `_abVariantOfBadge` React component:

- Reads `data._abVariantOf` from the form context
- Shows: `Variant of: {parentTitle} ↗` as a readonly link to `/admin/collections/{collectionSlug}/{parentId}`
- Condition: only rendered when `data._abVariantOf` is truthy

## Manifest Behaviour

No change to the manifest shape or storage adapters. The manifest is still:

```ts
Record<string, TVariantData[]>;
// e.g. { "/en/about": [{ bucket: "about--4ji9", rewritePath: "/en/about--4ji9", passPercentage: 30 }] }
```

Default `TVariantData` (when `generateVariantData` is omitted):

```ts
{
  bucket: string;
  rewritePath: string;
  passPercentage: number;
}
```

## Breaking Changes

- `variantCollectionSlug`, `parentField`, and `passPercentageField` removed from `CollectionABConfig`
- Users must migrate existing `page-variants` docs to the new inline variant model
- The `variantToParentCollectionSlugsMap` utility is no longer needed
