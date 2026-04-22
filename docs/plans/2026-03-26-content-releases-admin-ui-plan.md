# Content Releases Admin UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add admin UI components so editors can add documents (current state or specific versions) to releases from the Payload admin sidebar.

**Architecture:** A sidebar UI field (`_releases`) injected into enabled collections shows release status and two action buttons. "Add Current State" captures form data; "Add Version" opens a version picker. Both flow into a Release Picker Drawer. All components are `"use client"` React using `@payloadcms/ui` hooks. Communication via REST API fetch calls.

**Tech Stack:** React 19, TypeScript, `@payloadcms/ui` (Button, toast, useDocumentInfo, useForm), Payload REST API

---

## Task 1: Update build config for client entry point

**Files:**
- Modify: `packages/payload-plugin-content-releases/tsup.config.ts`
- Modify: `packages/payload-plugin-content-releases/package.json`
- Create: `packages/payload-plugin-content-releases/src/client.ts`

**Step 1: Create empty client barrel**

```typescript
// src/client.ts
export {};
```

**Step 2: Update tsup.config.ts — add client entry**

```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    client: "src/client.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  splitting: false,
  clean: true,
  external: ["payload", "@payloadcms/ui", "react"],
});
```

**Step 3: Update package.json — add exports, peerDependencies**

Add to `"exports"`:
```json
{
  ".": {
    "import": "./dist/index.js",
    "types": "./dist/index.d.ts"
  },
  "./client": {
    "import": "./dist/client.js",
    "types": "./dist/client.d.ts"
  }
}
```

Add to `"peerDependencies"`:
```json
{
  "payload": "^3.0.0",
  "@payloadcms/ui": "^3.0.0",
  "react": "^18.0.0 || ^19.0.0"
}
```

Add to `"devDependencies"`:
```json
{
  "@payloadcms/ui": "3.79.0",
  "react": "^19.0.0",
  "@types/react": "^19.0.0"
}
```

**Step 4: Install and build**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun install`
Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds, `dist/client.js` and `dist/client.d.ts` are created

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/
git commit -m "chore(content-releases): add client entry point and peer deps for admin UI"
```

---

## Task 2: Update plugin.ts to inject sidebar field into enabled collections

**Files:**
- Modify: `packages/payload-plugin-content-releases/src/plugin.ts`
- Create: `packages/payload-plugin-content-releases/src/__tests__/plugin-sidebar.test.ts`

**Step 1: Write the failing test**

```typescript
// src/__tests__/plugin-sidebar.test.ts
import { describe, it, expect } from "vitest";
import { contentReleasesPlugin } from "../plugin";
import type { Config } from "payload";

function makeBaseConfig(): Config {
  return {
    collections: [
      { slug: "pages", fields: [{ name: "title", type: "text" }] },
      { slug: "posts", fields: [{ name: "title", type: "text" }] },
    ],
    globals: [],
  } as Config;
}

describe("plugin sidebar injection", () => {
  it("should inject _releases UI field into enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    const pages = config.collections?.find((c) => c.slug === "pages");
    const releasesField = pages?.fields.find((f: any) => f.name === "_releases");
    expect(releasesField).toBeDefined();
    expect((releasesField as any).type).toBe("ui");
    expect((releasesField as any).admin?.position).toBe("sidebar");
  });

  it("should NOT inject _releases field into non-enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    const posts = config.collections?.find((c) => c.slug === "posts");
    const releasesField = posts?.fields.find((f: any) => f.name === "_releases");
    expect(releasesField).toBeUndefined();
  });

  it("should pass enabledCollections via admin.custom", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    expect((config.admin as any)?.custom?.contentReleases?.enabledCollections).toEqual(["pages"]);
  });

  it("should preserve existing fields on enabled collections", () => {
    const plugin = contentReleasesPlugin({ enabledCollections: ["pages"] });
    const config = plugin(makeBaseConfig());
    const pages = config.collections?.find((c) => c.slug === "pages");
    const titleField = pages?.fields.find((f: any) => f.name === "title");
    expect(titleField).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /Users/pashahurs/Projects/payload-plugins/packages/payload-plugin-content-releases && bunx vitest run src/__tests__/plugin-sidebar.test.ts`
Expected: FAIL

**Step 3: Update plugin.ts**

Add sidebar field injection — patch enabled collections to append the `_releases` UI field, and set `admin.custom.contentReleases`:

```typescript
const SIDEBAR_FIELD_PATH =
  "@focus-reactive/payload-plugin-content-releases/client#ReleaseSidebarField";

// Inside the plugin return function, before the final return:

// Patch enabled collections to inject sidebar UI field
const patchedCollections = (config.collections ?? []).map((collection) => {
  if (!enabledCollections.includes(collection.slug)) return collection;
  return {
    ...collection,
    fields: [
      ...collection.fields,
      {
        name: "_releases",
        type: "ui" as const,
        admin: {
          position: "sidebar" as const,
          components: {
            Field: SIDEBAR_FIELD_PATH,
          },
        },
      },
    ],
  };
});

// In the return statement, replace config.collections with patchedCollections,
// and add admin.custom:
return {
  ...config,
  admin: {
    ...config.admin,
    custom: {
      ...(config.admin as any)?.custom,
      contentReleases: {
        enabledCollections,
      },
    },
  },
  collections: [
    ...patchedCollections,
    releasesCollection,
    releaseItemsCollection,
  ],
  endpoints,
};
```

**Step 4: Run test to verify it passes**

Run: `cd /Users/pashahurs/Projects/payload-plugins/packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass

**Step 5: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`

**Step 6: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): inject _releases sidebar UI field into enabled collections"
```

---

## Task 3: Create ReleaseSidebarField component

**Files:**
- Create: `packages/payload-plugin-content-releases/src/admin/components/ReleaseSidebarField.tsx`
- Modify: `packages/payload-plugin-content-releases/src/client.ts`

**Step 1: Create the sidebar component**

```tsx
// src/admin/components/ReleaseSidebarField.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, useDocumentInfo } from "@payloadcms/ui";

interface ReleaseInfo {
  id: string;
  releaseId: string;
  releaseName: string;
  releaseStatus: string;
}

export function ReleaseSidebarField() {
  const { id, collectionSlug } = useDocumentInfo();
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReleaseDrawer, setShowReleaseDrawer] = useState(false);
  const [showVersionDrawer, setShowVersionDrawer] = useState(false);

  const fetchReleases = useCallback(async () => {
    if (!id || !collectionSlug) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/release-items?where[targetDoc][equals]=${id}&where[targetCollection][equals]=${collectionSlug}&depth=1&limit=100`
      );
      if (!res.ok) return;
      const data = await res.json();
      setReleases(
        (data.docs ?? []).map((item: any) => ({
          id: item.id,
          releaseId: typeof item.release === "object" ? item.release.id : item.release,
          releaseName: typeof item.release === "object" ? item.release.name : `Release ${item.release}`,
          releaseStatus: typeof item.release === "object" ? item.release.status : "unknown",
        }))
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [id, collectionSlug]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  if (!id) return null;

  const statusBadgeColor = (status: string) => {
    switch (status) {
      case "published": return "#22c55e";
      case "scheduled": return "#3b82f6";
      case "failed": return "#ef4444";
      default: return "#94a3b8";
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontWeight: 600, fontSize: "13px", textTransform: "uppercase", color: "#888" }}>
        Releases
      </div>

      {loading ? (
        <div style={{ fontSize: "13px", color: "#888" }}>Loading...</div>
      ) : releases.length === 0 ? (
        <div style={{ fontSize: "13px", color: "#888" }}>Not in any release</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {releases.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                borderRadius: "4px",
                border: "1px solid var(--theme-elevation-200)",
                fontSize: "13px",
              }}
            >
              <span>{r.releaseName}</span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "2px 6px",
                  borderRadius: "10px",
                  backgroundColor: statusBadgeColor(r.releaseStatus),
                  color: "#fff",
                }}
              >
                {r.releaseStatus}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        size="small"
        buttonStyle="secondary"
        onClick={() => setShowReleaseDrawer(true)}
      >
        Add Current State to Release
      </Button>

      <Button
        size="small"
        buttonStyle="secondary"
        onClick={() => setShowVersionDrawer(true)}
      >
        Add Version to Release
      </Button>

      {showReleaseDrawer && (
        <ReleaseDrawerPlaceholder
          onClose={() => {
            setShowReleaseDrawer(false);
            fetchReleases();
          }}
        />
      )}

      {showVersionDrawer && (
        <VersionPickerDrawerPlaceholder
          onClose={() => {
            setShowVersionDrawer(false);
            fetchReleases();
          }}
        />
      )}
    </div>
  );
}

// Temporary placeholders — replaced in Tasks 4 and 5
function ReleaseDrawerPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: 400, background: "var(--theme-elevation-0)", padding: 20, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3>Add to Release</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <p>Release drawer coming soon...</p>
      </div>
    </div>
  );
}

function VersionPickerDrawerPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", justifyContent: "flex-end" }}>
      <div style={{ width: 400, background: "var(--theme-elevation-0)", padding: 20, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3>Select Version</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <p>Version picker coming soon...</p>
      </div>
    </div>
  );
}
```

**Step 2: Update client.ts barrel export**

```typescript
// src/client.ts
export { ReleaseSidebarField } from "./admin/components/ReleaseSidebarField";
```

**Step 3: Build and verify**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`
Expected: Build succeeds, `dist/client.js` exports `ReleaseSidebarField`

**Step 4: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): add ReleaseSidebarField component with placeholders"
```

---

## Task 4: Create ReleaseDrawer component

**Files:**
- Create: `packages/payload-plugin-content-releases/src/admin/components/ReleaseDrawer.tsx`
- Modify: `packages/payload-plugin-content-releases/src/admin/components/ReleaseSidebarField.tsx`

**Step 1: Create ReleaseDrawer**

```tsx
// src/admin/components/ReleaseDrawer.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button, toast } from "@payloadcms/ui";

interface Release {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  itemCount?: number;
}

interface ReleaseDrawerProps {
  snapshot: Record<string, any>;
  collectionSlug: string;
  docId: string;
  baseVersion?: string;
  onClose: () => void;
}

export function ReleaseDrawer({
  snapshot,
  collectionSlug,
  docId,
  baseVersion,
  onClose,
}: ReleaseDrawerProps) {
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const fetchDraftReleases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/releases?where[status][equals]=draft&sort=-createdAt&limit=100`
      );
      if (!res.ok) return;
      const data = await res.json();
      setReleases(data.docs ?? []);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDraftReleases();
  }, [fetchDraftReleases]);

  const addToRelease = useCallback(
    async (releaseId: string, releaseName: string) => {
      try {
        const res = await fetch("/api/release-items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            release: releaseId,
            targetCollection: collectionSlug,
            targetDoc: docId,
            action: "publish",
            snapshot,
            baseVersion: baseVersion ?? null,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          const errMsg = err.errors?.[0]?.message ?? err.message ?? "Failed";

          // Check if duplicate
          if (errMsg.toLowerCase().includes("already exists")) {
            const confirmed = window.confirm(
              "This document is already in this release. Replace snapshot?"
            );
            if (confirmed) {
              // Find existing item and update
              const existing = await fetch(
                `/api/release-items?where[release][equals]=${releaseId}&where[targetDoc][equals]=${docId}&where[targetCollection][equals]=${collectionSlug}&limit=1`
              );
              const existingData = await existing.json();
              const existingItem = existingData.docs?.[0];
              if (existingItem) {
                await fetch(`/api/release-items/${existingItem.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    snapshot,
                    baseVersion: baseVersion ?? null,
                  }),
                });
                toast.success(`Updated snapshot in "${releaseName}"`);
                onClose();
                return;
              }
            }
            return;
          }

          toast.error(errMsg);
          return;
        }

        toast.success(`Added to "${releaseName}"`);
        onClose();
      } catch {
        toast.error("Failed to add to release");
      }
    },
    [collectionSlug, docId, snapshot, baseVersion, onClose]
  );

  const createAndAdd = useCallback(async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/releases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDescription.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Failed to create release");
        return;
      }
      const data = await res.json();
      await addToRelease(data.doc.id, data.doc.name);
    } catch {
      toast.error("Failed to create release");
    } finally {
      setCreating(false);
    }
  }, [newName, newDescription, addToRelease]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 420,
          background: "var(--theme-elevation-0)",
          padding: 24,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Add to Release</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--theme-text)" }}
          >
            ✕
          </button>
        </div>

        {/* Create New Release */}
        {!showCreateForm ? (
          <Button size="small" onClick={() => setShowCreateForm(true)}>
            Create New Release
          </Button>
        ) : (
          <div
            style={{
              border: "1px solid var(--theme-elevation-200)",
              borderRadius: 4,
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <input
              type="text"
              placeholder="Release name *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{
                padding: "8px 10px",
                borderRadius: 4,
                border: "1px solid var(--theme-elevation-300)",
                background: "var(--theme-elevation-50)",
                color: "var(--theme-text)",
                fontSize: 14,
              }}
              autoFocus
            />
            <textarea
              placeholder="Description (optional)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              style={{
                padding: "8px 10px",
                borderRadius: 4,
                border: "1px solid var(--theme-elevation-300)",
                background: "var(--theme-elevation-50)",
                color: "var(--theme-text)",
                fontSize: 14,
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="small" onClick={createAndAdd} disabled={!newName.trim() || creating}>
                {creating ? "Creating..." : "Create & Add"}
              </Button>
              <Button size="small" buttonStyle="secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Release List */}
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", color: "#888" }}>
          Draft Releases
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "#888" }}>Loading...</div>
        ) : releases.length === 0 ? (
          <div style={{ fontSize: 13, color: "#888" }}>No draft releases. Create one above.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {releases.map((r) => (
              <button
                key={r.id}
                onClick={() => addToRelease(r.id, r.name)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--theme-elevation-200)",
                  background: "var(--theme-elevation-50)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  color: "var(--theme-text)",
                  width: "100%",
                }}
              >
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update ReleaseSidebarField to use ReleaseDrawer**

Replace `ReleaseDrawerPlaceholder` import/usage with the real `ReleaseDrawer`. Import `useForm` from `@payloadcms/ui` to capture form data. When "Add Current State" is clicked, get `getData()` as snapshot and pass it to `ReleaseDrawer`.

Key change in ReleaseSidebarField.tsx:
```tsx
import { Button, useDocumentInfo, useForm } from "@payloadcms/ui";
import { ReleaseDrawer } from "./ReleaseDrawer";

// Inside the component:
const { getData } = useForm();

// When opening release drawer for current state:
const [currentSnapshot, setCurrentSnapshot] = useState<Record<string, any> | null>(null);

// Button handler:
onClick={() => {
  const formData = getData();
  setCurrentSnapshot(formData);
  setShowReleaseDrawer(true);
}}

// Render:
{showReleaseDrawer && currentSnapshot && (
  <ReleaseDrawer
    snapshot={currentSnapshot}
    collectionSlug={collectionSlug!}
    docId={String(id)}
    baseVersion={undefined}
    onClose={() => {
      setShowReleaseDrawer(false);
      setCurrentSnapshot(null);
      fetchReleases();
    }}
  />
)}
```

Remove `ReleaseDrawerPlaceholder`.

**Step 3: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`

**Step 4: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): add ReleaseDrawer with create new + select existing"
```

---

## Task 5: Create VersionPickerDrawer component

**Files:**
- Create: `packages/payload-plugin-content-releases/src/admin/components/VersionPickerDrawer.tsx`
- Modify: `packages/payload-plugin-content-releases/src/admin/components/ReleaseSidebarField.tsx`

**Step 1: Create VersionPickerDrawer**

```tsx
// src/admin/components/VersionPickerDrawer.tsx
"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ReleaseDrawer } from "./ReleaseDrawer";

interface VersionEntry {
  id: string;
  updatedAt: string;
  status?: string;
  autosave?: boolean;
  version: Record<string, any>;
}

interface VersionPickerDrawerProps {
  collectionSlug: string;
  docId: string;
  onClose: () => void;
}

export function VersionPickerDrawer({
  collectionSlug,
  docId,
  onClose,
}: VersionPickerDrawerProps) {
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/${collectionSlug}/versions?where[parent][equals]=${docId}&sort=-updatedAt&limit=20`
      );
      if (!res.ok) return;
      const data = await res.json();
      setVersions(
        (data.docs ?? []).map((v: any) => ({
          id: v.id,
          updatedAt: v.updatedAt,
          status: v.version?._status,
          autosave: v.autosave,
          version: v.version,
        }))
      );
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, [collectionSlug, docId]);

  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

  // Step 2: Show ReleaseDrawer with version snapshot
  if (selectedVersion) {
    return (
      <ReleaseDrawer
        snapshot={selectedVersion.version}
        collectionSlug={collectionSlug}
        docId={docId}
        baseVersion={selectedVersion.updatedAt}
        onClose={onClose}
        onBack={() => setSelectedVersion(null)}
      />
    );
  }

  // Step 1: Show version list
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 420,
          background: "var(--theme-elevation-0)",
          padding: 24,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Select Version</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--theme-text)" }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "#888" }}>Loading versions...</div>
        ) : versions.length === 0 ? (
          <div style={{ fontSize: 13, color: "#888" }}>No versions found for this document.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersion(v)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--theme-elevation-200)",
                  background: "var(--theme-elevation-50)",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 14,
                  color: "var(--theme-text)",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>
                    {new Date(v.updatedAt).toLocaleString()}
                  </span>
                  {v.autosave && (
                    <span style={{ fontSize: 11, color: "#888" }}>(autosave)</span>
                  )}
                </div>
                {v.status && (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 10,
                      backgroundColor: v.status === "published" ? "#22c55e" : "#94a3b8",
                      color: "#fff",
                    }}
                  >
                    {v.status}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <a
          href={`/admin/collections/${collectionSlug}/${docId}/versions`}
          style={{ fontSize: 13, color: "var(--theme-text)", textDecoration: "underline" }}
        >
          View all versions →
        </a>
      </div>
    </div>
  );
}
```

**Step 2: Add `onBack` prop to ReleaseDrawer**

Update `ReleaseDrawerProps` to accept optional `onBack?: () => void`. When provided, show a "← Back" button in the header. Update the header:

```tsx
// In ReleaseDrawer.tsx, add to props:
onBack?: () => void;

// In the header:
<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {onBack && (
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "var(--theme-text)" }}
      >
        ←
      </button>
    )}
    <h3 style={{ margin: 0 }}>Add to Release</h3>
  </div>
  <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--theme-text)" }}>
    ✕
  </button>
</div>
```

**Step 3: Update ReleaseSidebarField to use VersionPickerDrawer**

Replace `VersionPickerDrawerPlaceholder` with real `VersionPickerDrawer`:

```tsx
import { VersionPickerDrawer } from "./VersionPickerDrawer";

// Render:
{showVersionDrawer && (
  <VersionPickerDrawer
    collectionSlug={collectionSlug!}
    docId={String(id)}
    onClose={() => {
      setShowVersionDrawer(false);
      fetchReleases();
    }}
  />
)}
```

Remove `VersionPickerDrawerPlaceholder`.

**Step 4: Build**

Run: `bunx turbo run build --filter=@focus-reactive/payload-plugin-content-releases`

**Step 5: Commit**

```bash
git add packages/payload-plugin-content-releases/src/
git commit -m "feat(content-releases): add VersionPickerDrawer with two-step flow"
```

---

## Task 6: Update dev app and verify E2E

**Files:**
- Modify: `apps/dev/src/collections/Pages.ts` — ensure `versions: { drafts: true }` is present

**Step 1: Install deps and build**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bun install && bunx turbo run build --filter='./packages/*'`

**Step 2: Start dev app and manually verify**

Run: `bun run dev`

Verify in browser at `http://localhost:4040/admin`:
1. Navigate to a Page document
2. See "Releases" section in sidebar
3. Click "Add Current State to Release" → Release Drawer opens
4. Create a new release and add document
5. See toast notification and release appearing in sidebar
6. Click "Add Version to Release" → Version picker opens
7. Select a version → Release Drawer opens with back button

**Step 3: Commit**

```bash
git add .
git commit -m "feat(content-releases): verify admin UI integration in dev app"
```

---

## Task 7: Run full test suite and build verification

**Step 1: Run all unit tests**

Run: `cd /Users/pashahurs/Projects/payload-plugins/packages/payload-plugin-content-releases && bunx vitest run`
Expected: All tests pass (82+ existing + 4 new sidebar tests)

**Step 2: Build all packages**

Run: `cd /Users/pashahurs/Projects/payload-plugins && bunx turbo run build --filter='./packages/*'`
Expected: All packages build

**Step 3: Verify dist output**

Run: `ls packages/payload-plugin-content-releases/dist/`
Expected: `index.js`, `index.d.ts`, `client.js`, `client.d.ts` all present

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Build config: client entry + peer deps | tsup.config.ts, package.json, client.ts |
| 2 | Plugin: inject sidebar field + admin.custom | plugin.ts, plugin-sidebar.test.ts |
| 3 | ReleaseSidebarField component | ReleaseSidebarField.tsx, client.ts |
| 4 | ReleaseDrawer: create new + select existing | ReleaseDrawer.tsx |
| 5 | VersionPickerDrawer: version list → release | VersionPickerDrawer.tsx |
| 6 | Dev app integration + E2E verify | Pages.ts |
| 7 | Full test suite + build verification | — |

## Final File Tree (new files only)

```
packages/payload-plugin-content-releases/
  src/
    client.ts                                  # Barrel: exports ReleaseSidebarField
    admin/
      components/
        ReleaseSidebarField.tsx                 # Sidebar panel with status + 2 buttons
        ReleaseDrawer.tsx                       # Drawer: create release + pick from list
        VersionPickerDrawer.tsx                 # Drawer: pick version → flows to ReleaseDrawer
```
