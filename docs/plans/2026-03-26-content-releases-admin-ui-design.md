# Content Releases Admin UI — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Add admin UI components to `@focus-reactive/payload-plugin-content-releases` so editors can add documents (current state or specific versions) to releases directly from the Payload admin panel.

**Architecture:** Sidebar UI field injected into enabled collections + two Drawers (release picker, version picker). Client-side React components using `@payloadcms/ui` hooks. REST API calls to existing plugin endpoints and Payload's versions API.

---

## Entry Points

Two ways to add a document to a release:

1. **"Add Current State to Release"** — captures the current form state as snapshot
2. **"Add Version to Release"** — picks a specific version from history, uses its data as snapshot

Both entry points live in a **sidebar panel** on the document edit page.

---

## Sidebar Panel: "Releases"

Injected as a UI field with `admin.position: "sidebar"` into every collection from `enabledCollections`. Same pattern as `_abVariants` in payload-plugin-ab.

### Content

**Status section (top):**
- List of releases this document is already in (fetched via `GET /api/release-items?where[targetDoc][equals]={docId}&where[targetCollection][equals]={collectionSlug}`)
- Each shows: release name, status badge (draft/scheduled/published)
- If none: "Not in any release"

**"Add Current State to Release" button:**
- Captures form data via `useForm().getData()` as snapshot
- Sets `baseVersion` to document's current `updatedAt`
- Opens Release Picker Drawer (see below)

**"Add Version to Release" button:**
- Opens Version Picker Drawer (see below)

### Technical

```typescript
// Injected into collection fields by plugin
{
  name: "_releases",
  type: "ui",
  admin: {
    position: "sidebar",
    components: {
      Field: "@focus-reactive/payload-plugin-content-releases/client#ReleaseSidebarField"
    }
  }
}
```

Plugin config passed via `admin.custom.contentReleases`.

---

## Release Picker Drawer

Opened from both entry points. Receives a snapshot (from form or version) as prop.

### UI

**Header:** "Add to Release"

**"Create New Release" button (top):**
- Expands inline form:
  - Name (text, required)
  - Description (textarea, optional)
  - "Create & Add" / "Cancel" buttons
- On submit: `POST /api/releases` then `POST /api/release-items` with snapshot
- On success: toast notification, Drawer closes

**Draft releases list:**
- Fetched via `GET /api/releases?where[status][equals]=draft&sort=-createdAt&limit=100`
- Each row: release name, item count badge, created date
- Click → `POST /api/release-items` with snapshot → toast "Added to {release name}" → Drawer closes

**Conflict handling:**
- If document already exists in selected release (API returns 400/500 with "already exists" error)
- Show confirm: "This document is already in this release. Replace snapshot?"
- Yes → `PATCH /api/release-items/{existingItemId}` with new snapshot
- No → cancel, stay in Drawer

---

## Version Picker Drawer

Two-step Drawer. Only opened from "Add Version to Release" button.

### Step 1: Select Version

**Header:** "Select Version"

**Version list:**
- Fetched via `GET /api/{collection}/versions?where[parent][equals]={docId}&sort=-updatedAt&limit=20`
- Each row:
  - Date/time (formatted `updatedAt`)
  - Status badge: "Published" / "Draft" (from `version._status`)
  - "(autosave)" label if applicable
- Click → stores `version.version` as snapshot → transitions to Step 2

**Footer:** "View all versions" link → navigates to standard Payload versions tab

### Step 2: Select Release

Same UI as Release Picker Drawer above. Snapshot comes from selected version instead of form.

**"← Back" button** returns to Step 1.

---

## Component Structure

```
packages/payload-plugin-content-releases/
  src/
    client.ts                              # Barrel export for admin components
    admin/
      components/
        ReleaseSidebarField.tsx             # Sidebar panel (entry point)
        ReleaseDrawer.tsx                   # Drawer: release list + create new
        VersionPickerDrawer.tsx             # Drawer: version list → release picker
        ReleaseListItem.tsx                 # Single release row in drawer
        VersionListItem.tsx                 # Single version row in drawer
        CreateReleaseForm.tsx               # Inline form for new release
```

All components are `"use client"` React components.

### Exports

```typescript
// client.ts
export { ReleaseSidebarField } from "./admin/components/ReleaseSidebarField";
```

### tsup entry

Add second entry point:
```typescript
// tsup.config.ts
entry: {
  index: "src/index.ts",
  client: "src/client.ts",
}
```

### Package.json exports

```json
{
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./client": { "import": "./dist/client.js", "types": "./dist/client.d.ts" }
  }
}
```

### Peer dependencies (add)

```json
{
  "peerDependencies": {
    "payload": "^3.0.0",
    "@payloadcms/ui": "^3.0.0",
    "react": "^18.0.0 || ^19.0.0"
  }
}
```

---

## Plugin Integration

### Field injection

In `plugin.ts`, for each enabled collection, append the UI field:

```typescript
const patchedCollections = (config.collections ?? []).map((collection) => {
  if (!enabledCollections.includes(collection.slug)) return collection;
  return {
    ...collection,
    fields: [
      ...collection.fields,
      {
        name: "_releases",
        type: "ui",
        admin: {
          position: "sidebar",
          components: {
            Field: "@focus-reactive/payload-plugin-content-releases/client#ReleaseSidebarField",
          },
        },
      },
    ],
  };
});
```

### Admin custom config

```typescript
return {
  ...config,
  admin: {
    ...config.admin,
    custom: {
      ...config.admin?.custom,
      contentReleases: {
        enabledCollections,
      },
    },
  },
  // ... rest of config
};
```

---

## API Calls Summary

| Action | Method | Endpoint |
|--------|--------|----------|
| Fetch releases for document | GET | `/api/release-items?where[targetDoc][equals]={id}&where[targetCollection][equals]={slug}` |
| Fetch draft releases | GET | `/api/releases?where[status][equals]=draft&sort=-createdAt` |
| Fetch document versions | GET | `/api/{collection}/versions?where[parent][equals]={id}&sort=-updatedAt&limit=20` |
| Create release | POST | `/api/releases` |
| Add item to release | POST | `/api/release-items` |
| Update existing item | PATCH | `/api/release-items/{id}` |

---

## Known Limitations (v1)

1. **Localization:** Snapshot captures current locale only. Full multi-locale support is a future enhancement.
2. **Schema changes:** Old versions may lack new required fields. Publish will fail those items with clear error messages.
3. **Max 20 versions** shown in picker. Link to full versions tab for more.
4. **No preview** of snapshot diff before adding to release (future: show what will change).

---

## Potential Problems & Mitigations

| Problem | Mitigation |
|---------|-----------|
| Relationship fields in snapshots | Stored as IDs (not populated). `payload.update()` accepts IDs — no issue. |
| Large snapshots (rich text, blocks) | JSON field supports megabytes. Media stored as ID refs, not duplicated. |
| Stale sidebar after adding | Refetch release-items list after successful POST via state invalidation. |
| Duplicate item in release | API returns error → show confirm → PATCH to replace existing snapshot. |
| Version with changed schema | Publish catches validation error → item marked `failed` with message. |
