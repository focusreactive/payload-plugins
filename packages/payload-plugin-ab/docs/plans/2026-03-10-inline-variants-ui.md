# Inline Variants UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the separate `page-variants` collection with inline variant documents living in the parent collection, with a Variants panel UI on original pages and a "Variant Of" badge on variant pages.

**Architecture:** Variants are regular documents in the parent collection distinguished by an injected `_abVariantOf` relationship field. The plugin auto-injects all fields, UI components, hooks, a custom duplication endpoint, and hides variant docs from the collection list — zero extra config from users. The `page-variants` collection and all associated config options (`variantCollectionSlug`, `parentField`, `passPercentageField`) are removed.

**Tech Stack:** Payload CMS v3, React 18/19 (`'use client'`), `@payloadcms/ui` hooks, tsup (ESM build), TypeScript strict.

**Design doc:** `docs/plans/2026-03-10-inline-variants-ui-design.md`

---

## Task 1: Update constants and types

**Files:**
- Modify: `src/constants.ts`
- Modify: `src/types/config.ts`

**Step 1: Replace constants**

Replace the entire `src/constants.ts` with:

```ts
export const AB_VARIANT_OF_FIELD = "_abVariantOf";
export const AB_PASS_PERCENTAGE_FIELD = "_abPassPercentage";
export const DEFAULT_SLUG_FIELD = "slug";
```

**Step 2: Replace CollectionABConfig and AbTestingPluginConfig in `src/types/config.ts`**

Replace the entire file:

```ts
import type { GlobalConfig, Payload } from "payload";

export interface StorageAdapter<TVariantData extends object = object> {
  write(path: string, variants: TVariantData[], payload: Payload): Promise<void>;
  read(path: string): Promise<TVariantData[] | null>;
  clear(path: string, payload: Payload): Promise<void>;
  createGlobal?(debug: boolean): GlobalConfig;
}

export interface CollectionABConfig<TVariantData extends object = object> {
  /**
   * Dot-notation path to the slug field on the document.
   * Used to generate the cloned variant's slug: `{slug}--{nanoid}`.
   * Default: 'slug'
   */
  slugField?: string;
  /**
   * Optional dot-notation path to the tenant field on the document.
   * When set, the field is hidden on variant documents to prevent mismatches.
   */
  tenantField?: string;
  /**
   * Maps a document to the URL path used as the manifest key.
   * Return null to skip writing the manifest for that document.
   * Called once per locale when localization is enabled.
   */
  generatePath: (args: { doc: Record<string, unknown>; locale: string | undefined }) => string | null;
  /**
   * Builds the data stored per variant in the manifest.
   * When omitted, auto-generates: { bucket: variantSlug, rewritePath: generatePath(variantDoc), passPercentage: _abPassPercentage }
   */
  generateVariantData?: (args: {
    doc: Record<string, unknown>;
    variantDoc: Record<string, unknown>;
    locale: string | undefined;
  }) => TVariantData;
}

export interface AbTestingPluginConfig<TVariantData extends object = object> {
  /** Default: true */
  enabled?: boolean;
  /** If true, the manifest global is visible in the Payload admin panel. Default: false */
  debug?: boolean;
  /** Map of parent collection slug => A/B config for that collection. */
  collections: Record<string, CollectionABConfig<TVariantData>>;
  /** Storage adapter instance. */
  storage: StorageAdapter<TVariantData>;
}
```

**Step 3: Verify TypeScript still compiles**

```bash
cd /Users/maksim/Documents/code/payload-plugin-ab && pnpm tsc --noEmit 2>&1 | head -40
```

Expected: errors only from files that still import the old types — that's fine, we'll fix them in subsequent tasks.

**Step 4: Commit**

```bash
git add src/constants.ts src/types/config.ts
git commit -m "feat: simplify CollectionABConfig — remove variantCollectionSlug, parentField, passPercentageField"
```

---

## Task 2: Create the duplicate variant endpoint

**Files:**
- Create: `src/endpoints/duplicateVariant.ts`

**Background:** Payload v3 custom endpoints are registered on `config.endpoints`. The handler receives a `PayloadRequest` and returns a Web API `Response`. The endpoint duplicates the parent doc, strips identity fields, generates a new slug `{original}--{hash}`, sets `_abVariantOf` and `_abPassPercentage = 0`, and creates the new doc.

**Step 1: Create `src/endpoints/duplicateVariant.ts`**

```ts
import type { PayloadHandler } from "payload";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";

// 6-char alphanumeric hash — no external dep needed
function nanoid(): string {
  return Math.random().toString(36).slice(2, 8);
}

const STRIP_FIELDS = new Set(["id", "createdAt", "updatedAt", AB_VARIANT_OF_FIELD, AB_PASS_PERCENTAGE_FIELD]);

export const duplicateVariantHandler: PayloadHandler = async (req) => {
  if (!req.payload) {
    return Response.json({ error: "Payload not available" }, { status: 500 });
  }

  let body: { collectionSlug?: string; docId?: string; slugField?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { collectionSlug, docId, slugField = DEFAULT_SLUG_FIELD } = body;

  if (!collectionSlug || !docId) {
    return Response.json({ error: "collectionSlug and docId are required" }, { status: 400 });
  }

  let parentDoc: Record<string, unknown>;
  try {
    parentDoc = (await req.payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collectionSlug as any,
      id: docId,
      depth: 0,
      overrideAccess: false,
      req,
    })) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Parent document not found" }, { status: 404 });
  }

  if (!parentDoc) {
    return Response.json({ error: "Parent document not found" }, { status: 404 });
  }

  // Clone the doc, strip identity/internal fields
  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parentDoc)) {
    if (!STRIP_FIELDS.has(key)) {
      cloned[key] = value;
    }
  }

  const originalSlug = (parentDoc[slugField] as string) ?? docId;
  cloned[slugField] = `${originalSlug}--${nanoid()}`;
  cloned[AB_VARIANT_OF_FIELD] = docId;
  cloned[AB_PASS_PERCENTAGE_FIELD] = 0;

  let newDoc: Record<string, unknown>;
  try {
    newDoc = (await req.payload.create({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: collectionSlug as any,
      data: cloned,
      overrideAccess: false,
      req,
    })) as Record<string, unknown>;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create variant";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json(
    { id: newDoc.id, slug: newDoc[slugField] },
    { status: 201 },
  );
};
```

**Step 2: Verify no TypeScript errors in new file**

```bash
pnpm tsc --noEmit 2>&1 | grep "duplicateVariant"
```

Expected: no output (no errors in this file).

**Step 3: Commit**

```bash
git add src/endpoints/duplicateVariant.ts
git commit -m "feat: add duplicate variant endpoint handler"
```

---

## Task 3: Create the VariantsField admin component

**Files:**
- Create: `src/admin/components/VariantsField.tsx`

**Background:** Payload v3 `type: 'ui'` fields render a React component referenced by a string module path. The component uses `@payloadcms/ui` hooks:
- `useDocumentInfo()` → `{ id, collectionSlug }` of the current document
- The component fetches variants via the Payload REST API

The component path will be `@focus-reactive/payload-plugin-ab/admin/VariantsField#VariantsField` (added to tsup in Task 7).

**Step 1: Create `src/admin/components/VariantsField.tsx`**

```tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDocumentInfo } from "@payloadcms/ui";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD } from "../../constants";

interface VariantRow {
  id: string;
  title?: string;
  slug?: string;
  passPercentage: number;
}

interface VariantsFieldProps {
  slugField?: string;
  titleField?: string;
  collectionSlug?: string; // injected via customComponents clientProps
}

export function VariantsField({ slugField = "slug", titleField = "title", collectionSlug: collectionSlugProp }: VariantsFieldProps) {
  const { id, collectionSlug: docCollectionSlug } = useDocumentInfo();
  const slug = collectionSlugProp ?? docCollectionSlug;

  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  const fetchVariants = useCallback(async () => {
    if (!id || !slug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/${slug}?where[${AB_VARIANT_OF_FIELD}][equals]=${id}&limit=100&depth=0`,
      );
      if (!res.ok) throw new Error("Failed to fetch variants");
      const data = await res.json();
      setVariants(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (data.docs ?? []).map((doc: any) => ({
          id: doc.id,
          title: doc[titleField] ?? doc[slugField] ?? doc.id,
          slug: doc[slugField],
          passPercentage: (doc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 0,
        })),
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [id, slug, slugField, titleField]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleAddVariant = async () => {
    if (!id || !slug) return;
    try {
      const res = await fetch("/api/_ab/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionSlug: slug, docId: id, slugField }),
      });
      if (!res.ok) {
        const err = await res.json();
        showToast(`Error: ${err.error ?? "Unknown error"}`);
        return;
      }
      await fetchVariants();
      showToast("Variant created");
    } catch {
      showToast("Failed to create variant");
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!slug) return;
    try {
      await fetch(`/api/${slug}/${variantId}`, { method: "DELETE" });
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
    } catch {
      showToast("Failed to delete variant");
    }
  };

  const handleClearAll = async () => {
    if (!variants.length || !slug) return;
    if (!window.confirm(`Delete all ${variants.length} variant(s)?`)) return;
    await Promise.all(variants.map((v) => fetch(`/api/${slug}/${v.id}`, { method: "DELETE" })));
    setVariants([]);
  };

  const handlePercentageBlur = async (variantId: string, value: number) => {
    if (!slug) return;
    const clamped = Math.min(100, Math.max(0, value));
    try {
      await fetch(`/api/${slug}/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [AB_PASS_PERCENTAGE_FIELD]: clamped }),
      });
      setVariants((prev) =>
        prev.map((v) => (v.id === variantId ? { ...v, passPercentage: clamped } : v)),
      );
    } catch {
      showToast("Failed to update percentage");
    }
  };

  if (!id) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <label style={{ fontWeight: 600, fontSize: 14 }}>Variants</label>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#666" }}
          >
            Clear All
          </button>
        )}
      </div>

      {loading && <div style={{ fontSize: 13, color: "#888" }}>Loading…</div>}

      {variants.map((variant) => (
        <div
          key={variant.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            marginBottom: 6,
            background: "#fafafa",
          }}
        >
          <span style={{ flex: 1, fontSize: 14 }}>{variant.title}</span>
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={variant.passPercentage}
            onBlur={(e) => handlePercentageBlur(variant.id, Number(e.target.value))}
            style={{ width: 60, padding: "2px 6px", fontSize: 13, border: "1px solid #ccc", borderRadius: 3 }}
            title="Traffic percentage (0–100)"
          />
          <span style={{ fontSize: 11, color: "#888" }}>%</span>
          <a
            href={`/admin/collections/${slug}/${variant.id}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#555", display: "flex", alignItems: "center" }}
            title="Edit variant"
          >
            ↗
          </a>
          <button
            type="button"
            onClick={() => handleDeleteVariant(variant.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#888", fontSize: 16, lineHeight: 1 }}
            title="Remove variant"
          >
            ×
          </button>
        </div>
      ))}

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleAddVariant}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            color: "#333",
            padding: 0,
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add new
        </button>
      </div>

      {toast && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            background: "#e8f4fd",
            borderRadius: 4,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✓</span> {toast}
        </div>
      )}
    </div>
  );
}

export default VariantsField;
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "VariantsField"
```

Expected: no output.

**Step 3: Commit**

```bash
git add src/admin/components/VariantsField.tsx
git commit -m "feat: add VariantsField admin component"
```

---

## ~~Task 4~~: VariantOfBadge component — **not needed**

The `_abVariantOf` relationship field is rendered natively by Payload in the sidebar (read-only) on variant pages. No custom React component required. Task 4 is skipped.

---

## Task 5: Create injectAdminFields utility

**Files:**
- Create: `src/utils/injectAdminFields.ts`

**What this injects (all appended to the sidebar):**

| Field | Type | Where shown | Behaviour |
|---|---|---|---|
| `_abVariantOf` | `relationship` (self) | Variant pages only | Sidebar, read-only. Shows which original page this is a variant of. Hidden on original pages. |
| `_abPassPercentage` | `number` | Hidden everywhere | Managed inline via the Variants panel. Not shown directly. |
| `_abVariants` | `ui` | Original pages only | Sidebar. Variants panel — list of variants with % inputs and edit links. |
| `slug` | patched | Original pages only | Hidden on variant pages via condition (slug is auto-generated, must not change). |
| `tenantField` | patched | Original pages only | Hidden on variant pages via condition (tenant must match parent). |

`admin.baseListFilter` is patched to hide variant docs from the collection list view.

**Step 1: Create `src/utils/injectAdminFields.ts`**

```ts
import type { CollectionConfig, Field } from "payload";
import type { CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";

const VARIANTS_FIELD_PATH = "@focus-reactive/payload-plugin-ab/admin/VariantsField#VariantsField";

function isVariant(data: Record<string, unknown>): boolean {
  return Boolean(data[AB_VARIANT_OF_FIELD]);
}

/** Patch a top-level field to be hidden on variant documents. */
function hideOnVariant(field: Field): Field {
  return {
    ...field,
    admin: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(field as any).admin,
      condition: (data: Record<string, unknown>) => !isVariant(data),
    },
  } as Field;
}

/** Find a top-level field by name and patch it. Returns the new fields array. */
function patchField(fields: Field[], name: string, patcher: (f: Field) => Field): Field[] {
  return fields.map((f) => {
    if ("name" in f && f.name === name) return patcher(f);
    return f;
  });
}

export function injectAdminFields<TVariantData extends object>(
  collection: CollectionConfig,
  collectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
): CollectionConfig {
  const slugField = abConfig.slugField ?? DEFAULT_SLUG_FIELD;

  // 1. _abVariantOf — native relationship field in sidebar, read-only, visible on variant pages only.
  //    Payload renders this natively: shows the parent page title with a link.
  const variantOfField: Field = {
    name: AB_VARIANT_OF_FIELD,
    type: "relationship",
    relationTo: collectionSlug as CollectionConfig["slug"],
    admin: {
      position: "sidebar",
      readOnly: true,
      condition: (data: Record<string, unknown>) => isVariant(data),
      description: "The original page this variant belongs to.",
    },
  };

  // 2. _abPassPercentage — hidden everywhere; managed inline in the Variants panel.
  const passPercentageField: Field = {
    name: AB_PASS_PERCENTAGE_FIELD,
    type: "number",
    min: 0,
    max: 100,
    admin: {
      hidden: true,
    },
  };

  // 3. _abVariants — Variants panel UI field in sidebar, visible on original pages only.
  const variantsUiField: Field = {
    name: "_abVariants",
    type: "ui",
    admin: {
      position: "sidebar",
      condition: (data: Record<string, unknown>) => !isVariant(data),
      components: {
        Field: VARIANTS_FIELD_PATH,
      },
    },
  };

  // 4. Hide slug on variant pages (auto-generated slug must not be changed manually).
  let patchedFields = patchField(collection.fields ?? [], slugField, hideOnVariant);

  // 5. Hide tenantField on variant pages (must match parent — not editable on variants).
  if (abConfig.tenantField) {
    const topLevelTenantFieldName = abConfig.tenantField.split(".")[0];
    patchedFields = patchField(patchedFields, topLevelTenantFieldName, hideOnVariant);
  }

  // 6. Assemble: internal data fields first, then user fields, then sidebar UI last.
  const newFields: Field[] = [
    variantOfField,
    passPercentageField,
    ...patchedFields,
    variantsUiField,
  ];

  // 7. Patch admin.baseListFilter to exclude variant docs from the collection list view.
  const existingBaseListFilter = collection.admin?.baseListFilter;
  const newBaseListFilter = existingBaseListFilter
    ? async (...args: Parameters<NonNullable<typeof existingBaseListFilter>>) => {
        const existing = await existingBaseListFilter(...args);
        return {
          and: [existing, { [AB_VARIANT_OF_FIELD]: { exists: false } }],
        };
      }
    : () => ({ [AB_VARIANT_OF_FIELD]: { exists: false } });

  return {
    ...collection,
    fields: newFields,
    admin: {
      ...collection.admin,
      baseListFilter: newBaseListFilter,
    },
  };
}
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep "injectAdminFields"
```

Expected: no output.

**Step 3: Commit**

```bash
git add src/utils/injectAdminFields.ts
git commit -m "feat: add injectAdminFields utility"
```

---

## Task 6: Create new hooks for the parent collection

**Files:**
- Create: `src/hooks/buildParentAfterChangeHook.ts`
- Create: `src/hooks/buildParentAfterDeleteHook.ts`
- Create: `src/hooks/buildParentBeforeChangeHook.ts`

**Background:** Hooks now fire on ALL docs in the parent collection. Each hook inspects `_abVariantOf`:
- If set → the doc is a variant. Recompute the manifest for the parent (`_abVariantOf` value).
- If not set → the doc is an original. Recompute the manifest using all of its variants.

For `afterChange` on an original doc (not variant), we still need to recompute because `generatePath` / `generateVariantData` may depend on parent fields (e.g., slug, locale).

Default variant data (when `generateVariantData` is omitted):
```ts
{ bucket: variantSlug, rewritePath: generatePath(variantDoc, locale), passPercentage: _abPassPercentage ?? 0 }
```

**Step 1: Create `src/hooks/buildParentAfterChangeHook.ts`**

```ts
import type { CollectionAfterChangeHook, CollectionSlug, TypedLocale } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";
import { getLocales } from "../utils/getLocales";

async function recomputeManifestForParent<TVariantData extends object>(
  parentId: string | number,
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  req: any,
): Promise<void> {
  const { payload } = req;
  const locales = getLocales(payload);
  const slugField = abConfig.slugField ?? DEFAULT_SLUG_FIELD;

  for (const locale of locales) {
    const parentDoc = await payload.findByID({
      collection: parentCollectionSlug as CollectionSlug,
      id: parentId,
      depth: 0,
      locale: locale as TypedLocale,
      overrideAccess: true,
      req,
    });
    if (!parentDoc) continue;

    const manifestKey = abConfig.generatePath({ doc: parentDoc, locale });
    if (!manifestKey) continue;

    const { docs: variantDocs } = await payload.find({
      collection: parentCollectionSlug as CollectionSlug,
      where: { [AB_VARIANT_OF_FIELD]: { equals: parentId } },
      depth: 0,
      locale: locale as TypedLocale,
      overrideAccess: true,
      limit: 100,
      req,
    });

    if (variantDocs.length === 0) {
      await pluginConfig.storage.clear(manifestKey, payload);
      continue;
    }

    const variantData = variantDocs.map((variantDoc) => {
      if (abConfig.generateVariantData) {
        return abConfig.generateVariantData({ doc: parentDoc, variantDoc, locale });
      }
      // Default: derive bucket from slug, rewritePath from generatePath on variant doc
      const variantPath = abConfig.generatePath({ doc: variantDoc, locale });
      return {
        bucket: (variantDoc[slugField] as string) ?? String(variantDoc.id),
        rewritePath: variantPath ?? "",
        passPercentage: (variantDoc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 0,
      } as unknown as TVariantData;
    });

    await pluginConfig.storage.write(manifestKey, variantData, payload);
  }
}

export function buildParentAfterChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>,
): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const { payload } = req;
    if (!payload) return;

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    if (variantOfValue) {
      // This doc is a variant — recompute manifest for its parent
      const parentId = resolveId(variantOfValue);
      if (!parentId) return;
      await recomputeManifestForParent(parentId, parentCollectionSlug, abConfig, pluginConfig, req);
    } else {
      // This doc is an original — recompute manifest using its own variants
      await recomputeManifestForParent(doc.id, parentCollectionSlug, abConfig, pluginConfig, req);
    }
  };
}
```

**Step 2: Create `src/hooks/buildParentAfterDeleteHook.ts`**

```ts
import type { CollectionAfterDeleteHook, CollectionSlug, TypedLocale } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD, DEFAULT_SLUG_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";
import { getLocales } from "../utils/getLocales";

export function buildParentAfterDeleteHook<TVariantData extends object>(
  parentCollectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>,
  pluginConfig: AbTestingPluginConfig<TVariantData>,
): CollectionAfterDeleteHook {
  return async ({ doc, req, id }) => {
    const { payload } = req;
    if (!payload) return;

    const variantOfValue = doc[AB_VARIANT_OF_FIELD];

    // Only act when a variant doc is deleted
    if (!variantOfValue) return;

    const parentId = resolveId(variantOfValue);
    if (!parentId) return;

    const locales = getLocales(payload);
    const slugField = abConfig.slugField ?? DEFAULT_SLUG_FIELD;

    for (const locale of locales) {
      const parentDoc = await payload.findByID({
        collection: parentCollectionSlug as CollectionSlug,
        id: parentId,
        depth: 0,
        locale: locale as TypedLocale,
        overrideAccess: true,
        req,
      });
      if (!parentDoc) continue;

      const manifestKey = abConfig.generatePath({ doc: parentDoc, locale });
      if (!manifestKey) continue;

      const { docs: remainingVariants } = await payload.find({
        collection: parentCollectionSlug as CollectionSlug,
        where: {
          and: [{ [AB_VARIANT_OF_FIELD]: { equals: parentId } }, { id: { not_equals: id } }],
        },
        depth: 0,
        locale: locale as TypedLocale,
        overrideAccess: true,
        limit: 100,
        req,
      });

      if (remainingVariants.length === 0) {
        await pluginConfig.storage.clear(manifestKey, payload);
      } else {
        const variantData = remainingVariants.map((variantDoc) => {
          if (abConfig.generateVariantData) {
            return abConfig.generateVariantData({ doc: parentDoc, variantDoc, locale });
          }
          const variantPath = abConfig.generatePath({ doc: variantDoc, locale });
          return {
            bucket: (variantDoc[slugField] as string) ?? String(variantDoc.id),
            rewritePath: variantPath ?? "",
            passPercentage: (variantDoc[AB_PASS_PERCENTAGE_FIELD] as number) ?? 0,
          } as unknown as TVariantData;
        });
        await pluginConfig.storage.write(manifestKey, variantData, payload);
      }
    }
  };
}
```

**Step 3: Create `src/hooks/buildParentBeforeChangeHook.ts`**

This validates that the sum of `_abPassPercentage` across sibling variants (same parent) doesn't exceed 100.

```ts
import { ValidationError } from "payload";
import type { CollectionBeforeChangeHook, CollectionSlug } from "payload";
import type { AbTestingPluginConfig, CollectionABConfig } from "../types/config";
import { AB_PASS_PERCENTAGE_FIELD, AB_VARIANT_OF_FIELD } from "../constants";
import { resolveId } from "../utils/resolveId";

export function buildParentBeforeChangeHook<TVariantData extends object>(
  parentCollectionSlug: string,
  _abConfig: CollectionABConfig<TVariantData>,
  _pluginConfig: AbTestingPluginConfig<TVariantData>,
): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, req, operation }) => {
    // Only validate when saving a variant doc
    const variantOfValue = data[AB_VARIANT_OF_FIELD] ?? originalDoc?.[AB_VARIANT_OF_FIELD];
    if (!variantOfValue) return data;

    const passPercentage = data[AB_PASS_PERCENTAGE_FIELD];
    if (passPercentage === undefined || passPercentage === null) return data;

    const parentId = resolveId(variantOfValue);
    if (!parentId) return data;

    const conditions: object[] = [{ [AB_VARIANT_OF_FIELD]: { equals: parentId } }];

    if (operation === "update" && originalDoc?.id) {
      conditions.push({ id: { not_equals: originalDoc.id } });
    }

    const { docs: siblings } = await req.payload.find({
      collection: parentCollectionSlug as CollectionSlug,
      where: { and: conditions },
      depth: 0,
      overrideAccess: true,
      req,
    });

    const existingSum = siblings.reduce((sum, doc) => {
      const pct = doc[AB_PASS_PERCENTAGE_FIELD];
      return sum + (typeof pct === "number" ? pct : 0);
    }, 0);

    if (existingSum + (passPercentage as number) > 100) {
      const remaining = 100 - existingSum;
      throw new ValidationError({
        errors: [
          {
            path: AB_PASS_PERCENTAGE_FIELD,
            message: `Total variant traffic for this page is ${existingSum}%. This variant cannot exceed ${remaining}% (would exceed 100%).`,
          },
        ],
      });
    }

    return data;
  };
}
```

**Step 4: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | grep -E "buildParent"
```

Expected: no output.

**Step 5: Commit**

```bash
git add src/hooks/buildParentAfterChangeHook.ts src/hooks/buildParentAfterDeleteHook.ts src/hooks/buildParentBeforeChangeHook.ts
git commit -m "feat: add parent collection hooks for inline variant model"
```

---

## Task 7: Refactor plugin.ts

**Files:**
- Modify: `src/plugin.ts`

**What changes:**
- Register the `/_ab/duplicate` endpoint on `config.endpoints`
- Replace `addHooksToVariantCollections` (which patched variant collections) with a new approach that patches **parent collections**
- Inject admin fields into parent collections via `injectAdminFields`
- Inject the three new hooks (`beforeChange`, `afterChange`, `afterDelete`) into parent collections

**Step 1: Replace `src/plugin.ts`**

```ts
import type { CollectionConfig, Config, Plugin } from "payload";
import type { AbTestingPluginConfig } from "./types/config";
import { injectAdminFields } from "./utils/injectAdminFields";
import { buildParentAfterChangeHook } from "./hooks/buildParentAfterChangeHook";
import { buildParentAfterDeleteHook } from "./hooks/buildParentAfterDeleteHook";
import { buildParentBeforeChangeHook } from "./hooks/buildParentBeforeChangeHook";
import { duplicateVariantHandler } from "./endpoints/duplicateVariant";

export const abTestingPlugin =
  <TVariantData extends object>(pluginConfig: AbTestingPluginConfig<TVariantData>): Plugin =>
  (incomingConfig: Config): Config => {
    const { enabled = true, debug = false, collections, storage } = pluginConfig;

    if (!enabled) return incomingConfig;

    const extraGlobals = storage.createGlobal ? [storage.createGlobal(debug)] : [];

    const patchedCollections = (incomingConfig.collections ?? []).map((collection): CollectionConfig => {
      const abConfig = collections[collection.slug];
      if (!abConfig) return collection;

      // Inject admin fields (UI panel, hidden data fields, list filter)
      const withAdminFields = injectAdminFields(collection, collection.slug, abConfig);

      // Inject hooks
      return {
        ...withAdminFields,
        hooks: {
          ...withAdminFields.hooks,
          beforeChange: [
            ...(withAdminFields.hooks?.beforeChange ?? []),
            buildParentBeforeChangeHook(collection.slug, abConfig, pluginConfig),
          ],
          afterChange: [
            ...(withAdminFields.hooks?.afterChange ?? []),
            buildParentAfterChangeHook(collection.slug, abConfig, pluginConfig),
          ],
          afterDelete: [
            ...(withAdminFields.hooks?.afterDelete ?? []),
            buildParentAfterDeleteHook(collection.slug, abConfig, pluginConfig),
          ],
        },
      };
    });

    return {
      ...incomingConfig,
      collections: patchedCollections,
      globals: [...(incomingConfig.globals ?? []), ...extraGlobals],
      endpoints: [
        ...(incomingConfig.endpoints ?? []),
        {
          path: "/_ab/duplicate",
          method: "post",
          handler: duplicateVariantHandler,
        },
      ],
    };
  };
```

**Step 2: Verify TypeScript**

```bash
pnpm tsc --noEmit 2>&1 | head -40
```

Expected: errors only from files that still import removed symbols (`DEFAULT_PARENT_FIELD`, old hook files). We'll clean those up next.

**Step 3: Commit**

```bash
git add src/plugin.ts
git commit -m "feat: refactor plugin to use inline variant model"
```

---

## Task 8: Remove obsolete files and clean up imports

**Files:**
- Delete: `src/utils/addHooksToVariantCollections.ts`
- Delete: `src/utils/buildVariantToParentCollectionSlugsMap.ts`
- Delete: `src/hooks/validateVariantPercentageSum.ts`
- Delete: `src/hooks/buildAfterChangeHook.ts`
- Delete: `src/hooks/buildAfterDeleteHook.ts`

**Step 1: Delete obsolete files**

```bash
rm src/utils/addHooksToVariantCollections.ts
rm src/utils/buildVariantToParentCollectionSlugsMap.ts
rm src/hooks/validateVariantPercentageSum.ts
rm src/hooks/buildAfterChangeHook.ts
rm src/hooks/buildAfterDeleteHook.ts
```

**Step 2: Verify TypeScript now compiles cleanly**

```bash
pnpm tsc --noEmit 2>&1
```

Expected: no errors. If there are remaining import errors, fix them by removing the orphaned imports.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove obsolete variant collection hooks and utils"
```

---

## Task 9: Add admin component entry points to tsup and package.json

**Files:**
- Modify: `tsup.config.ts`
- Modify: `package.json`

**Background:** The admin components are referenced by string path in Payload v3 field configs. They must be compiled by tsup so Next.js can import them from `node_modules`. `@payloadcms/ui` must be added as an external dependency.

**Step 1: Update `tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'adapters/payloadGlobal/index': 'src/adapters/payloadGlobal/index.ts',
    'adapters/vercelEdge/index': 'src/adapters/vercelEdge/index.ts',
    'analytics/index': 'src/analytics/index.ts',
    'analytics/client': 'src/analytics/client.ts',
    'analytics/adapters/googleAnalytics/index':
      'src/analytics/adapters/googleAnalytics/index.ts',
    'middleware/index': 'src/middleware/index.ts',
    'admin/VariantsField': 'src/admin/components/VariantsField.tsx',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  external: ['payload', 'react', 'next', '@vercel/edge-config', '@payloadcms/ui'],
})
```

**Step 2: Add exports to `package.json`**

In the `"exports"` object, add after the existing entries (find the closing `}` of `"exports"` and insert before it):

```json
"./admin/VariantsField": {
  "import": "./dist/admin/VariantsField.js",
  "types": "./dist/admin/VariantsField.d.ts"
}
```

Also add to the `"typesVersions"` `"*"` object:

```json
"admin/VariantsField": ["./dist/admin/VariantsField.d.ts"]
```

**Step 3: Run the build to verify**

```bash
pnpm build 2>&1 | tail -20
```

Expected: build succeeds, `dist/admin/VariantsField.js` and `dist/admin/VariantOfBadge.js` are generated.

```bash
ls dist/admin/
```

Expected: `VariantsField.js`, `VariantsField.d.ts`

**Step 4: Commit**

```bash
git add tsup.config.ts package.json
git commit -m "build: add admin component entry points to tsup and package exports"
```

---

## Task 10: Update README

**Files:**
- Modify: `README.md`

**Step 1: Update the Quick Start section**

Replace "Step 1 — Create a variant collection" with the new approach. The new Step 1 is simply:

> Variants are now created automatically as duplicates of the parent doc — no separate variant collection needed. Skip to Step 2.

Update the `CollectionABConfig` reference table to remove `variantCollectionSlug`, `parentField`, `passPercentageField` and add `slugField`.

Update the "How It Works" diagram to show the new flow:

```
Payload Admin (click "+ Add new" on original page)
     │
     │  POST /api/_ab/duplicate
     ▼
Duplicate parent doc → new slug `{slug}--{hash}`, _abVariantOf = parentId
     │
     │  afterChange hook fires on new variant doc
     ▼
Manifest updated: { "/about": [{ bucket: "about--4ji9", rewritePath: "...", passPercentage: 0 }] }
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README for inline variant model"
```

---

## Task 11: Final build and smoke test

**Step 1: Full build**

```bash
pnpm build
```

Expected: exits 0, no errors.

**Step 2: TypeScript strict check**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

**Step 3: Verify dist structure**

```bash
ls dist/ && ls dist/admin/
```

Expected:
```
dist/
  index.js  index.d.ts
  admin/
    VariantsField.js  VariantsField.d.ts
  adapters/  analytics/  middleware/
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: inline variants UI — complete implementation"
```
