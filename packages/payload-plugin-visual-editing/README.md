# @focus-reactive/payload-plugin-visual-editing

Visual editing plugin for Payload CMS. Embeds field-path markers into draft content via Vercel stega, then renders in-place edit overlays on the frontend that deep-link back into Payload admin via a postMessage bridge.

## Installation

```bash
bun add @focus-reactive/payload-plugin-visual-editing
```

Peer dependencies: `payload ^3.79`, `@payloadcms/ui ^3.79`, `react ^18 || ^19`. `next` is optional.

## Compatibility

Requires Payload **3.79 or newer** (within the 3.x line), supplied by the host app. `@payloadcms/ui`, `payload`, and `react` are peer dependencies, so the plugin shares the host's single copy rather than bundling its own. Built and tested against Payload `3.84.1`.

## Setup

The plugin has two halves: a **server half** (Payload hooks that embed stega path-markers into draft reads, register the admin bridge, and strip stega back out on write) and a **client half** (the frontend overlay that turns those markers into click-to-edit badges). Enrichment only happens for **draft** content served to the **frontend** — never the admin form or published reads — so the flow below wires Next.js draft mode end to end.

Steps 1–2 set up the server, steps 3–5 connect draft preview, steps 6–8 finish the client. The `apps/dev` app in this repo is a complete working reference.

### 1. Register the plugin — `payload.config.ts`

```ts
import { buildConfig } from 'payload'
import { visualEditingPlugin } from '@focus-reactive/payload-plugin-visual-editing'

export default buildConfig({
  // ...
  plugins: [
    visualEditingPlugin({
      // all optional:
      skipCollections: ['media'],    // collection slugs to exclude from enrichment
      skipGlobals: [],               // global slugs to exclude
      excludeFieldNames: ['tenant'], // extra field names to strip (merged with '_status', 'folder', 'slug')
      adminBasePath: '/admin',       // Payload admin base path (default '/admin')
    }),
  ],
})
```

This adds enrichment hooks to every non-skipped collection and global, registers the `VisualEditingBridgeProvider` admin component, and adds a `beforeChange` hook that strips stega from writes so markers can never be persisted to the database.

### 2. Enable drafts on editable collections

The plugin only enriches **draft** reads, so each collection you want to edit visually needs Payload drafts turned on:

```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: { drafts: true },
  // fields...
}
```

### 3. Add draft-mode preview routes

Next.js draft mode is what flips a frontend read into a draft read. Add a route that enables it (and one that exits):

```ts
// app/(frontend)/next/preview/route.ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path')
  // same-origin relative paths only — block open redirects
  if (!path || !path.startsWith('/') || path.startsWith('//')) {
    return new Response('Invalid path', { status: 400 })
  }
  ;(await draftMode()).enable()
  redirect(path)
}
```

```ts
// app/(frontend)/next/exit-preview/route.ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path')
  ;(await draftMode()).disable()
  redirect(path && path.startsWith('/') && !path.startsWith('//') ? path : '/')
}
```

### 4. Point Live Preview at the preview route

So the CMS side-by-side preview opens the frontend already in draft mode, set the collection's `admin.livePreview.url` to go through `/next/preview`:

```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    livePreview: {
      url: ({ data }) => {
        const slug = typeof data?.slug === 'string' ? data.slug : ''
        return `${process.env.NEXT_PUBLIC_SERVER_URL}/next/preview?path=${encodeURIComponent(`/${slug}`)}`
      },
    },
  },
  versions: { drafts: true },
  // fields...
}
```

### 5. Fetch drafts in the frontend page

Read the document with `draft` tied to draft mode — stega is only embedded on draft reads:

```tsx
// app/(frontend)/[slug]/page.tsx
import { draftMode } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'pages',
    draft,
    depth: 1, // ≥ 1 so uploads/relationships populate (see "Editable richText and upload fields")
    where: { slug: { equals: slug } },
  })
  // render docs[0]
}
```

### 6. Wrap the frontend layout

Mount the provider (gated on draft mode), the toggle, and the overlay:

```tsx
// app/(frontend)/layout.tsx
import { VisualEditing } from '@focus-reactive/payload-plugin-visual-editing/client'
import { draftMode } from 'next/headers'

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html>
      <body>
        <VisualEditing.Provider available={isEnabled} framedOnly adminBasePath="/admin">
          <VisualEditing.Toggle />
          <VisualEditing.Overlay>{children}</VisualEditing.Overlay>
        </VisualEditing.Provider>
      </body>
    </html>
  )
}
```

- `available` enables the overlay only when draft mode is on; a user-level toggle (stored in `localStorage`) then gates whether badges actually render.
- `framedOnly` (optional) restricts the overlay to the CMS preview iframe — omit it to also allow editing when the frontend is opened in a standalone tab.
- `VisualEditing.Toggle` renders the floating off/hover/always control; `VisualEditing.Overlay` scans the DOM for markers and draws the edit badges.

### 7. Mark richText and upload fields

`text` / `textarea` / `email` fields are picked up automatically. `richText` and `upload` values opt out of inline stega and need one line in your renderer — see [Editable richText and upload fields](#editable-richtext-and-upload-fields).

### 8. Regenerate the admin import map

The bridge is registered as an admin component, so refresh Payload's import map (re-run after config changes):

```bash
bunx payload generate:importmap
```

### Using it

Open a document in the admin, open the **Live Preview** side panel (it loads the frontend in draft mode), then flip the floating toggle to **Always** or **Hover**. Editable text shows an outline and an **Edit** badge; clicking it focuses that field in the admin form. To leave draft mode when viewing the frontend directly, hit `/next/exit-preview`.

## Editable richText and upload fields

Most fields (`text`, `textarea`, `email`, …) are edit-overlayable automatically — the plugin weaves zero-width stega characters into their rendered text and the client overlay picks them up. Two kinds of values opt out of stega and need one line in your renderer:

- **`richText`** — treated as a leaf-renderer black box; no stega is embedded into its rendered paragraphs.
- **`upload:<slug>`** — its populated value is a different document whose `_meta` is preserved for wrapper-attr consumption instead of being re-encoded.

For both, spread `withVisualEditingPath(value)` onto the element you want to receive the Edit badge.

```tsx
import { withVisualEditingPath } from '@focus-reactive/payload-plugin-visual-editing/client'
```

### RichText

```tsx
import { RichText } from '@payloadcms/richtext-lexical/react'

<div {...withVisualEditingPath(page.content)}>
  <RichText data={page.content} />
</div>
```

### Upload — single relationTo

```tsx
<img
  src={page.image.url}
  alt={page.image.alt}
  {...withVisualEditingPath(page.image)}
/>
```

### Upload — polymorphic (`relationTo: ['media', 'videos']`)

Spread on `value`, not the wrapper:

```tsx
<img
  src={page.image.value.url}
  alt={page.image.value.alt}
  {...withVisualEditingPath(page.image.value)}
/>
```

Clicking the Edit badge on an upload opens the media document's admin page (not a field on the host doc).

**Uploads require `depth ≥ 1`** so Payload returns the populated media document alongside its `_meta`. At `depth: 0` the value is a bare id string and no overlay is drawn.

## How it works

### Server pipeline

1. `beforeOperation` stamps `req.context` with the draft flag.
2. `afterRead` (gated to draft reads served to the frontend Local API — admin-panel reads, identified by their admin pathname, and REST reads are skipped) walks the returned document, attaches `_meta.path` markers to leaf-ish objects, and for rich-text / primitive-terminal types sets `_meta.terminal = true` so outer collection walks don't clobber them.
3. `afterOperation` uses the collection's schema to embed Vercel stega into text fields, carrying the field path all the way through SSR into the client DOM.
4. Before stega is embedded, a small pre-pass walks each enriched doc's schema against its data. Populated `upload:<slug>` values are flipped to `_meta.terminal = true` so their identity is preserved for wrapper-attr consumption on the client (`<img {...withVisualEditingPath(upload)} />`), without embedding zero-width stega into `alt` or `filename`.
5. `beforeChange` strips stega from every write as a safety net, so markers can never be persisted even if a read is ever mis-classified.

The schema cache (per slug, memoized) resolves relationship targets lazily so you don't pay for unused collections.

### Client overlay

`VisualEditing.Overlay` mounts a MutationObserver inside its effect, scans existing DOM for stega-bearing text, and redraws edit badges on mount, lazy-mount, and DOM mutations. Clicking a badge reaches `VisualEditingBridgeProvider` (via `postMessage` to the parent admin when framed, or `window.opener` when opened from an admin tab) → schema walk → field focus.

## Options

| Option | Type | Default | Purpose |
|---|---|---|---|
| `skipCollections` | `string[]` | `[]` | Exclude these collection slugs from enrichment. Payload internal collections are always skipped. |
| `skipGlobals` | `string[]` | `[]` | Exclude these global slugs from enrichment. |
| `excludeFieldNames` | `string[]` | `[]` | Extra field names to strip from the serialized schema. Always merged with `_status`, `folder`, `slug`. |
| `adminBasePath` | `string` | `/admin` | Payload admin base path. Used to exclude admin reads from enrichment and by the bridge for URL parsing and admin-tab navigation. |

The `VisualEditing.Provider` (client) also accepts `framedOnly` (restrict the overlay to the CMS preview iframe) and `adminBasePath` (must match the server option).

## Caveats

- **`target="_blank"` must not carry `noopener`.** The postMessage bridge requires `window.opener` to be non-null. If you open the frontend from the admin tab with a plain anchor, browsers default `window.opener` to `null` on `target="_blank"` unless you explicitly opt out. Use `window.open(url, '_blank', 'noopener=no')` or cross-tab messaging will fail silently. (Not a concern in the side-by-side Live Preview, which messages the parent frame.)
- **The overlay hook intentionally collapses effect deps to `[enabled]`** via `ctxRef`. Do not "fix" this — parent re-renders would teardown the MutationObserver and lazy-mounted content (React.lazy / Suspense) would stop getting outlined.
- **`_meta.terminal = true` on rich-text is load-bearing** — prevents outer `afterRead` walks from clobbering inner markers when collections relate to other collections.
- **`slug` is excluded from stega** — zero-width chars inside a slug corrupt URLs (become noisy `%E2%80%8B` sequences).

## License

MIT
