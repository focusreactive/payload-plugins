# @focus-reactive/payload-plugin-visual-editing

Click-to-edit for Payload CMS. On draft reads the plugin writes an invisible marker into every text value. The frontend overlay finds those markers in the rendered page, frames the elements and adds an **Edit** badge. A click focuses the field in the Payload admin. With the optional instant preview, text typed in the admin form appears in the Live Preview before it is saved.

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload project.

```
Add click-to-edit to my Payload CMS v3 project with @focus-reactive/payload-plugin-visual-editing.

What it does: draft reads get invisible markers in their text values. An overlay on the frontend frames
the marked elements with an Edit badge, and a click focuses that field in the admin (in Live Preview or
in a new admin tab). Markers are removed from every write, and published reads stay clean.
First find out how my frontend renders: React / Next.js (step 4a) or no React, such as a static site
generator, server templates, Vue or Svelte (step 4b).

1. Install: bun add @focus-reactive/payload-plugin-visual-editing
   (payload and @payloadcms/ui 3.79+, react 19 in the admin; a React frontend needs react 18.2+,
   a frontend without React needs nothing)

2. In payload.config.ts:

   import { visualEditingPlugin } from '@focus-reactive/payload-plugin-visual-editing'

   visualEditingPlugin({ enrichment: 'explicit' })   // optionally: instantPreview: true

3. Editable collections and globals need versions: { drafts: true } and admin.livePreview.url pointing
   at the preview of the page. On Next.js that is a route that enables draft mode and redirects to the
   page (/next/preview?path=/<slug>), plus /next/exit-preview. Accept only paths that start with one "/".
   Then run: payload generate:importmap

4a. React / Next.js frontend:
   - Read with the draft mode flag:
     const { isEnabled: draft } = await draftMode()
     payload.find({ collection: 'pages', draft, depth: 1, context: { visualEditing: draft }, where: ... })
   - Wrap the layout:
     import { VisualEditing } from '@focus-reactive/payload-plugin-visual-editing/client'
     <VisualEditing.Provider available={isEnabled} framedOnly adminBasePath="/admin">
       <VisualEditing.Toggle />
       <VisualEditing.Overlay>{children}</VisualEditing.Overlay>
     </VisualEditing.Provider>
   - Rich text, uploads and relationships: spread withVisualEditingPath(value) from /client on the
     element that renders them, e.g. <img {...withVisualEditingPath(page.image)} />

4b. Frontend without React:
   - Read drafts over REST or GraphQL with draft=true, the x-visual-editing header and the session of a
     Payload user (a service user that may only read drafts: Authorization: JWT <token>, or
     users API-Key <key>). Leave the header out of production builds.
   - In the preview only, after the page has rendered:
     import { mountVisualEditing } from '@focus-reactive/payload-plugin-visual-editing/dom'
     mountVisualEditing({ adminOrigin: 'https://cms.example.com', framedOnly: true,
                          onSave: () => location.reload() })
   - Rich text, uploads and relationships: print the attributes of withVisualEditingPath(value) from
     /dom on the element that renders them. Where a template turns text into an id, slug or selector,
     clean it with stripMarkers(value) first.

Check: open a page in the admin, open Live Preview, set the toggle to Always, click a heading and see
its field focused in the form. Instant preview of rich text structure, editing on the page and the
options: see the plugin README.
```

## Installation

```bash
bun add @focus-reactive/payload-plugin-visual-editing
```

Peer dependencies, all optional: `payload ^3.79`, `@payloadcms/ui ^3.79`, `react` and `react-dom` `^18.2.0 || ^19.0.0`. What you need depends on where you use the package:

- The Payload app (the plugin and its admin components) needs `payload`, `@payloadcms/ui` and React 19, which Payload 3 requires anyway.
- A React frontend that imports `./client` needs `react` and `react-dom` 18.2 or newer.
- A site that imports only `./dom` needs none of them.
- A site that lets its editors write rich text on the page imports `./rich-text` and needs Lexical: `lexical`, `@lexical/rich-text`, `@lexical/list`, `@lexical/history`, `@lexical/selection` and `@lexical/utils`, all `0.50.0`, the version `@payloadcms/richtext-lexical` 3.90 uses. Before 3.90 it uses Lexical 0.41, so a site on Payload 3.79 to 3.89 installs 0.50 next to it. No other entry of the package imports them, see [The Lexical packages](#the-lexical-packages).

The plugin does not import `next`; the setup below uses Next.js because the Payload admin runs on it. It is built and tested against Payload `3.90.1`.

## Setup

The plugin has a server half (Payload hooks that mark draft reads and strip markers from writes, plus an admin component) and a client half (the overlay on your frontend). Markers are written only into **draft** reads outside the admin: reads made with the **Local API**, and REST or GraphQL reads that send the `x-visual-editing` header with the session of a signed-in user, see [Pages without React](#pages-without-react). The steps below use the Local API and wire Next.js draft mode end to end. `apps/cms` in this repository uses the plugin with `enrichment: 'explicit'`, instant preview and `LiveRichText`, and is the working reference.

### 1. Register the plugin

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { visualEditingPlugin } from '@focus-reactive/payload-plugin-visual-editing'

export default buildConfig({
  // ...
  plugins: [visualEditingPlugin()],
})
```

See [Options](#options) for what you can pass.

### 2. Enable drafts on editable collections

```ts
export const Pages: CollectionConfig = {
  slug: 'pages',
  versions: { drafts: true },
  // fields...
}
```

### 3. Add draft-mode routes

```ts
// app/(frontend)/next/preview/route.ts
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'

export async function GET(req: Request) {
  const path = new URL(req.url).searchParams.get('path')
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

The example assumes two things of your project: that `NEXT_PUBLIC_SERVER_URL` holds the origin of the frontend, and that a document has a `slug` field from which its route is built. Build the URL from whatever your routes use.

### 5. Read drafts in the frontend page

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
    depth: 1,
    where: { slug: { equals: slug } },
  })
  // render docs[0]
}
```

A global is read the same way, `payload.findGlobal({ slug: 'header', draft })`, and is marked at every `depth`. With `enrichment: 'explicit'`, also pass `context: { visualEditing: draft }`, see [Enrichment modes](#enrichment-modes).

### 6. Wrap the frontend layout

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

- `VisualEditing.Toggle` is the floating Off / Hover / Always control. It starts on **Off**: a page shows no outlines until the editor picks **Hover** or **Always**. With [editing on the page](#editing-on-the-page) it starts on **Hover** instead. A mode the editor picked, **Off** too, is used from then on. The chosen mode is kept in `localStorage` under the key `visual-editing`, per origin of the page. It starts in the top right corner and can be dragged anywhere in the window; the place it was dropped is kept in `localStorage` under `visual-editing-toggle-position`. It stays in view all the time, also while the editor hovers editable text.
- `VisualEditing.Overlay` scans its children for markers. Content outside it is not touched.

### 7. Mark rich text, uploads and relationships

Text fields work on their own. Rich text, uploads and related documents need one spread in your renderer, see [Rich text, uploads and relationships](#rich-text-uploads-and-relationships).

### 8. Regenerate the admin import map

```bash
bunx payload generate:importmap
```

### Using it

Open a document in the admin, open **Live Preview** and set the toggle to **Always** or **Hover**. Editable text gets a frame and an **Edit** badge. The frame is one rectangle around the element and its text, also when its text wraps or its letters are taller than its line height, and it is drawn above the page, so the page's own styles are not changed. On a page that sets CSS `zoom` on an ancestor, such as `body { zoom: 1.25 }`, the frames, the badge, the toolbar of rich text and the toggle sit where the zoomed content is drawn, in a browser that reports the zoom of an element (`currentCSSZoom`); elsewhere they are placed as without a zoom. A click on the badge or anywhere inside the frame focuses the field in the admin form; the field's border turns blue and pulses briefly, then the field keeps Payload's normal focus style. The frame and the badge stay while the pointer moves from the frame onto the badge, across the gap between them or over another target on the way, and while it rests on the badge or its **Replace image** button; the pointer over the toggle, the status or the toolbar of rich text changes no frame, and a click there opens no field. A click with a modifier key and a text selection keep the page's own behaviour; a double click does nothing. Text or an image beneath an empty layer of the page, such as a decorative layer over an image, or inside a container with `pointer-events: none`, is found where it is drawn: the frame, the badge and a click work as over the text or the image itself, but not over a layer that holds text, an icon or other media. Over a control of the page, such as a link, a button, a form control, a video or an element with `role="button"`, `role="link"` or a `tabindex`, the frame and the badge of what is drawn beneath still show where the control draws none of its own text or media, and over none of a control that paints itself with a `background-image`, a `mask-image` or the content of `::before` or `::after`, such as the icon font of a carousel arrow, so a link laid over a whole card still offers **Replace image** for the card's image, while the text or logo of a link in a header shows nothing beneath it; a click goes to the control. Text the page renders for screen readers only, hidden with `clip`, `clip-path: inset(50%)`, a box of one pixel, `opacity: 0`, `visibility: hidden` or a font size of `0`, gets no frame, so a link over a whole card that names the card only in such text still offers the image beneath it and its click follows the link. This is checked while the pointer is over the text, not once when the page loads, so text the page shows later, such as text that fades in on scroll or the panel of a tab or an accordion, can be edited as soon as it is shown. Where targets are drawn over each other, the one painted on top is taken; a target the browser does not hit, such as one with `pointer-events: none`, is taken over one it hits when its `position` and `z-index` stack it higher, and left below it when they are stacked alike; of two targets the browser does not hit, the later one in the page is taken. The frame and the hit area hold only the text an element shows: text cut off by `overflow`, an ellipsis or a line clamp is left out. A click on text of another document opens that document in a new admin tab.

To leave draft mode in a normal browser tab, open `/next/exit-preview`.

Frames and the badge are drawn above the whole page, so they would also cross a sticky header or another bar that stays over the content while it scrolls. Mark such an element with `data-ve-cover` and the part of every frame and badge that lies under it is hidden:

```tsx
<header className="sticky top-0" data-ve-cover>
```

The cover hides nothing of its own content: a field rendered inside it keeps its whole frame.

Inside the admin, visual editing runs only in the Live Preview iframe. A page shown in any other iframe of the admin, such as a card that previews the document in a custom field, shows no toggle, no outlines, no instant preview and no editing on the page. The `data-visual-editing` attribute of the iframe decides instead, when it is there: `"on"` turns visual editing on in another iframe, `"off"` turns it off in the Live Preview:

```tsx
<iframe src={previewUrl} data-visual-editing="on" />
```

A page of the admin's origin reads its iframe before it shows anything. A page of another origin asks the admin when it loads and turns off when the answer comes.

On a draft page where the overlay does not run (the toggle is **Off** and the page passes `instantPreview={false}`, `framedOnly` outside the Live Preview, or an iframe of the admin other than the Live Preview), the markers are still removed from the text, every attribute, the title and the meta tags of `<head>`, also from content rendered later. There are no outlines and no instant preview there.

### Handing the field to another admin component

Before the bridge expands collapsibles and focuses a field the editor clicked in the preview, it
dispatches a cancelable `payload:open-field` event on `window` (`OPEN_FIELD_EVENT`). This happens
only when the clicked field belongs to the document that is open in the admin:

```ts
window.addEventListener('payload:open-field', (event) => {
  const { path, collectionSlug, globalSlug, docId, locale } = (event as CustomEvent).detail
  // e.g. path: 'layout.0.items.1.title'
  event.preventDefault() // take over: the bridge does nothing else
})
```

Admin UI that shows nested fields its own way uses the event to open the field there. One example
is `@focus-reactive/payload-plugin-stacked-editing`, which opens array and blocks rows in stacked
panels. If no listener cancels the event, the bridge behaves as before. `announceOpenField(detail)`
and the `OpenFieldEventDetail` type are exported for components that want to raise the same event.

## What gets a marker

- Fields of type `text`, `textarea` and `email`, at any depth: in groups, tabs, rows, collapsibles, array rows and blocks (declared inline or through `blockReferences`).
- The name of a block (`blockName`), unless the block sets `admin.disableBlockName`. A click on a rendered block name focuses the name input in the block header.
- Not: empty values, and values that match `excludeValues` (by default URLs, slugs like `hello-world`, `#fragments` and ISO dates). A range of numbers such as `8-10` and a text that starts with a hash, such as `#1 in the ranking`, are marked.
- Not: fields named `slug`, `folder`, `_status`, `apiKey` or anything in `excludeFieldNames`.
- Not: fields the editor cannot change in the admin, that is `hidden: true`, `admin.hidden`, `admin.readOnly` or `admin.disabled`, and everything inside a group, array or blocks field that has one of them.
- Not: `text` fields with `hasMany`, numbers, selects, dates and other non-text fields.
- With `instantPreview` only: every text node of a Lexical rich text field, see [Markers in rich text](#markers-in-rich-text).

A populated document (a relationship or an upload read with `depth ≥ 1`) is marked as itself: its text carries its own collection, id and paths, wherever it appears. A populated document of a collection listed in `skipCollections` gets no markers. One exception: the description of the media document of an `upload` field that holds one document of one collection, `alt` by default (`imageDescriptionField` names another field), carries the marker of that upload field instead, with the id of the media, so an image rendered with `alt` alone is found as the image of the field. A click on such an image, or on a caption that a template renders from the same `alt`, opens that upload field of the page, not the `alt` of the media document; edit the description in the media document itself. An empty or missing description gets no marker, since a marker would make it a non-empty string and change checks such as `alt || filename` or `{alt && <figcaption>}` in drafts: an image with an empty description is found only when the page marks it with `withVisualEditingPath` or the `data-ve-*` attributes. A description left out by `excludeFieldNames` or matched by `excludeValues` stays as the media document has it.

If you render a marked value into an attribute, the overlay removes the marker from it: `alt`, `aria-label`, an `href`, a `style`, an `id`, a `data-*` attribute. It also cleans `document.title`. An image whose `alt` carries the marker of a field becomes the edit target of that field, usually the upload field that shows it, unless the image already names its field with `withVisualEditingPath` or sits in an element marked with it that holds no other image. An element whose whole text is one marked field, such as a heading, gets the `data-ve-*` attributes of that field while the overlay runs, so it stays the edit target when a script of your site splits its text into words or characters after the overlay found it. The overlay cleans the page in the browser, so a value the template transforms before the browser sees it (a slug, a hash, a number it parses) keeps the invisible characters inside the transform: clean it first with `stripMarkers` or keep the field away with `excludeFieldNames`.

## Rich text, uploads and relationships

The text of a rich text field belongs to its renderer, and an image has no text node to carry a marker. For these values the plugin leaves a `_meta` object on the value that says which field of which document holds it. Spread `withVisualEditingPath(value)` on the element that should become the edit target. For a value that holds a document, such as an upload, it also writes the id of that document as `data-ve-value-id`, so a replaced image is refused as **Changed elsewhere** when the field was given other media after the page showed it:

```tsx
import { withVisualEditingPath } from '@focus-reactive/payload-plugin-visual-editing/client'
import { RichText } from '@payloadcms/richtext-lexical/react'

<div {...withVisualEditingPath(page.content)}>
  <RichText data={page.content} />
</div>

<img src={page.image.url} alt={page.image.alt} {...withVisualEditingPath(page.image)} />

<article {...withVisualEditingPath(page.author)}>
  <h3>{page.author.name}</h3>
</article>
```

A click on such an element focuses the rich text, upload or relationship field **in the document that holds it** (`image` of the page), not the media or author document.

| Field | Where the `_meta` is |
|---|---|
| rich text | `page.content` |
| upload or relationship | `page.image`, the populated document |
| `hasMany` | every populated document: `page.gallery[0]`, `page.gallery[1]`. Each addresses the field `gallery` |
| several `relationTo` | `page.image` (the `{ relationTo, value }` object) and `page.image.value` |

Uploads and relationships need `depth ≥ 1`. At `depth: 0` the value of a field with one `relationTo` is an id and has no `_meta`. `withVisualEditingPath` returns `{}` for a value without `_meta`, so the spread is safe on published pages.

Text inside the populated document, such as `page.image.alt` or `page.author.name`, is a text field of that document. If its collection is not skipped it has its own marker, and a click on it opens the media or author document.

## Instant preview

Without it the Live Preview shows an edit after Payload has saved it and the frontend has rendered again. With it, text typed in the admin form appears in the preview on the same keystroke. The save and the re-render still happen and stay the source of truth.

Turn it on in the plugin and regenerate the import map:

```ts
// payload.config.ts
visualEditingPlugin({ instantPreview: true })
```

The page half is on by default: `VisualEditing.Provider` and `mountVisualEditing` listen for the admin, and the admin sends nothing unless the plugin option is on. Pass `instantPreview={false}` (`instantPreview: false` without React) to a page that should not listen; with the toggle on **Off** the overlay then does not run at all and the page only loses its markers.

### Requirements

- Live Preview is configured for the collection or global: `admin.livePreview` on it, or its slug in the root `admin.livePreview.collections` / `globals`.
- The frontend refreshes itself after a save, for example with `RefreshRouteOnSave` from `@payloadcms/live-preview-react`, see below.
- The admin posts to the origin of the Live Preview URL. The preview posts to `adminOrigin` on `VisualEditing.Provider`, its own origin by default.
- On a localized site, pass the locale of the page: `<VisualEditing.Overlay locale={locale}>`. The admin tags its messages with the locale it is editing, and the overlay can only ignore another locale when it knows its own.
- The admin bundle and the frontend overlay come from the same version of the plugin. An overlay of 1.1.1 or earlier leaves the markers of rich text in the page, and an overlay of 1.2.0 or earlier cannot read the shorter markers this version writes and leaves every marker in the text.
- Rich text is rendered inside an element that spreads `withVisualEditingPath(value)`, see [Rich text, uploads and relationships](#rich-text-uploads-and-relationships). Without that wrapper its text is not live.

A refresh after every save, with Payload's own component:

```bash
bun add @payloadcms/live-preview-react
```

```tsx
// components/RefreshOnSave.tsx
'use client'

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react'
import { useRouter } from 'next/navigation'

export const RefreshOnSave = () => {
  const router = useRouter()
  const adminOrigin = typeof window === 'undefined' ? '' : window.location.origin
  return <RefreshRouteOnSave refresh={() => router.refresh()} serverURL={adminOrigin} />
}
```

```tsx
// app/(frontend)/layout.tsx
{isEnabled && <RefreshOnSave />}
```

`RefreshRouteOnSave` refreshes only on a message whose origin equals `serverURL` exactly, so with another value the page never refreshes and nothing reports it. The snippet is for an admin served from the same origin as the page, as in a Next.js app that hosts Payload; the component renders nothing, and its listener starts in the browser, where the origin is known. With the admin on another origin, pass that origin, without a trailing slash.

### What updates instantly

- `text`, `textarea` and `email` fields that have a marker on the page, the block name included.
- Text typed, deleted or replaced inside existing text of a Lexical rich text field: in paragraphs, headings, list items, quotes, links and formatted text.
- With [`LiveRichText`](#unsaved-rich-text-structure): every edit that changes the structure of a Lexical rich text field, such as a new paragraph, a list, a heading, bold on a part of a text, a link, an upload or a new block, and the text typed after it.
- Only where the page renders the stored value unchanged.
- In an element whose whole text is one field after a script of your site split that text into words or characters, while the element still shows the value the field had. The overlay writes the new value as plain text into the element, so the split and its animation are gone from the preview until the page reloads.
- In every toggle position, also **Off**. The toggle controls frames, badges and click-to-edit only.

### What waits for the save

- Every other field type: numbers, uploads, relationships, selects, checkboxes, dates, `code`, `json`, `text` with `hasMany`.
- In rich text that is not wrapped in [`LiveRichText`](#unsaved-rich-text-structure), an edit that changes the structure: a paragraph, list, link, block or upload added or removed, or formatting applied to a part of a text, which splits it. From that edit on the preview keeps the structure of the last save, with the text it showed when the structure changed, until the autosave has landed and the page has rendered the new structure; then its text is live again. Autosave is debounced, so that happens after a pause in typing. An edit that returns to the saved structure is live again at once.
- Rich text whose stored tree Lexical normalises on the first edit, such as imported or seeded content with neighbouring texts of the same format, which Lexical merges on the first keystroke. That is an edit of the structure; the field is live after its first save from the editor.
- In rich text, formatting that does not change the structure. Bold on a whole text, another heading level, list type or link URL shows after the save, or with the next structural edit of a field in `LiveRichText`; the text keeps updating meanwhile.
- Text in the fields of a block inside rich text, Slate rich text, and a rich text field whose name contains `#`.
- Rows and blocks that are added, removed, duplicated or moved. Text typed into a new row appears with the save that creates the row. A moved row keeps its text; the order changes with the next refresh.
- A field that was empty in the last render. An empty value has no marker, so text typed into it appears with the next save.
- Values the page transforms: uppercased in JavaScript, truncated, formatted, parsed into markup. The overlay rewrites a text node only while it shows a value the field recently had.
- Localized fields, and all rich text, on a page that reads the document with `locale: 'all'`.

### What is sent to the preview

The admin posts field values to the preview window with `postMessage`. Every script on the preview page can read them. A value is sent only when all of these hold:

1. The field belongs to the document that is open in the admin form.
2. The preview page has rendered that field, with a marker, at least once since it loaded. The page tells the admin which fields those are. From then on the admin sends the field's value on every change until the preview window loads another page, also while the field is not on screen.
3. The field can carry a marker under the rules in [What gets a marker](#what-gets-a-marker), read from the collection or global config. Values that exist only in the form, such as a typed `password`, are never sent.
4. The collection has no `auth`. Fields of auth collections are marked for click-to-edit but never sent.

Rule 3 is the boundary you control. The list in rule 2 comes from the preview page, so a script running there could ask for any field that passes rule 3. Keep a field away from the preview with `excludeFieldNames`, `admin.readOnly`, `admin.hidden` or `hidden`.

For a rich text field that passes these rules the admin sends the saved and the current text of single text nodes the page announced. It sends the editor state of the field only to a page that renders it in [`LiveRichText`](#unsaved-rich-text-structure), and only when the structure changes. While the editor holds another structure than the saved one it sends, in place of the current text, the last text those nodes had under the saved structure while this preview page was listening, or else their saved text.

The editor state of a rich text field holds its text, the ids of uploads, relationships and linked documents, and the fields of link and upload nodes. The admin posts it when the structure of the field changes, and only for a field the page announced as rendered in `LiveRichText`. That announcement also comes from the page, so the boundary is again rule 3 for the rich text field itself. Blocks in the state are posted with their id and type and without the values of their fields. The page hands the state to your Server Action, which answers only to a signed-in user who may read the document. A page that renders rich text in the browser, with `renderValue` on `LiveRichText` or `renderRichTextValue` without React, also renders the posted state itself, with data Payload already gave that page, see [Rendering on the page with `renderValue`](#rendering-on-the-page-with-rendervalue) and [Rendered on the page first](#rendered-on-the-page-first).

A page states the locale of its overlay when it reports its fields. The admin sends nothing to a page that states another locale than the one the form is in. A page whose overlay has no `locale` states none and is answered in every locale.

`excludeValues` is not applied in the admin. A value that matches it has no marker on the page and is not sent, unless the page rendered the same field with a marker earlier in this page load.

When the Live Preview iframe loads another page, the admin stops sending and waits for that page to report its fields. A page without the overlay is sent nothing. When the admin switches to another locale it stops sending as well, until the preview has loaded a page again; text typed in one locale is never sent to a page that was loaded for another, provided the overlay of that page was given its `locale`.

### Unsaved rich text structure

Typing inside existing text needs nothing but the wrapper. A new paragraph, a list or a bold word changes the structure of the value, and the page cannot build that markup from text alone: it comes from your renderer. `LiveRichText` asks your app to render the unsaved editor state and shows the result until the saved render has the same structure. The reference setup uses a Server Action of the Next.js App Router.

Three pieces, all in your app. The component that renders rich text:

```tsx
// components/RichText/Body.tsx
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { withVisualEditingPath } from '@focus-reactive/payload-plugin-visual-editing/client'
import { RichText } from '@payloadcms/richtext-lexical/react'

export const RichTextBody = ({ content }: { content: SerializedEditorState }) => (
  <div {...withVisualEditingPath(content)}>
    <RichText data={content} />
  </div>
)
```

A Server Action that renders the unsaved state with that same component:

```tsx
// components/RichText/renderUnsavedRichText.tsx
'use server'

import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { readUnsavedRichText } from '@focus-reactive/payload-plugin-visual-editing'
import config from '@payload-config'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'

import { RichTextBody } from './Body'

export async function renderUnsavedRichText(request: unknown) {
  const { isEnabled } = await draftMode()
  if (!isEnabled) return null

  const content = await readUnsavedRichText<SerializedEditorState>({
    headers: await headers(),
    payload: await getPayload({ config }),
    request,
  })
  return content && <RichTextBody content={content} />
}
```

And the component your pages use:

```tsx
// components/RichText/index.tsx
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { LiveRichText, liveRichTextOf } from '@focus-reactive/payload-plugin-visual-editing/client'

import { RichTextBody } from './Body'
import { renderUnsavedRichText } from './renderUnsavedRichText'

export const RichText = ({ content }: { content: SerializedEditorState }) => {
  const body = <RichTextBody content={content} />
  const liveRichText = liveRichTextOf(content)
  if (!liveRichText) return body

  return (
    <LiveRichText {...liveRichText} action={renderUnsavedRichText}>
      {body}
    </LiveRichText>
  )
}
```

- `liveRichTextOf(content)` returns the identity of the field, the structure of the saved value, its `_meta` and whether it holds blocks, uploads, relationships or links to documents, about 300 bytes, or `null` for a value that is not a marked rich text: every published read, a read with `locale: 'all'`, a row without an `id`. A published page therefore gets no client component and no extra payload, and the value itself is never passed to the client.
- The action must render through the component the page uses, with the same wrapper element. React then swaps the two renders in place, and the text typed after the structural edit keeps updating through the markers.
- Props the renderer needs (a variant, a class name) can be bound: `action={renderUnsavedRichText.bind(null, { variant })}`. They arrive as the first argument of the action.
- `LiveRichText` renders no element of its own. Outside draft mode or with `instantPreview` off it only renders its children.
- Put it inside `VisualEditing.Overlay`. The overlay passes its `locale` on, and `LiveRichText` ignores the admin while it edits another locale.

`LiveRichText` makes one call at a time and only the latest state waits. It starts a call 200 ms after the first new structure, so the structures of one edit (Enter, then the first character of the new paragraph) make one call. When a call fails, takes longer than ten seconds or returns `null`, and when the returned elements throw while rendering, the preview shows the saved render, as it does without `LiveRichText`, and asks again a few times per structure, for about half a minute. A call that hangs is never joined by a second one.

**A Server Action shares a queue with `router.refresh()`.** While a render call is out, the refresh that brings the saved render waits for it. `readUnsavedRichText` answers `null` after `timeLimitMs` (three seconds by default), which bounds that wait per call within one server process. A slow server delays the saved render by up to one call; it never shows a wrong frame.

**Another transport.** Pass `render` in place of `action` to make the call yourself: `render(request, signal)` returns a promise of React nodes and gets an `AbortSignal` that `LiveRichText` aborts when it stops waiting. A route handler can answer a `fetch` with that signal with `readUnsavedRichText({ payload, request })` as JSON; that call stays off the router's queue and can be cancelled, but the page then renders the marked editor state in the browser, so your renderer and everything it renders for uploads, links and blocks must work as Client Components.

`readUnsavedRichText` is the only safe way to turn the posted state into something to render on the server. Hand it the argument of the action untouched. It guarantees:

- **Nothing from the request is trusted.** It accepts a document of the config, a key that names a rich text field the plugin marks, a locale of the project and a Lexical editor state of at most `maxStateLength` characters of JSON (`DEFAULT_MAX_UNSAVED_STATE_LENGTH`, one million). The fields of blocks and uploads and the extra fields of links come from the saved document by node id, and related documents are reduced to their ids. The target of a link (`doc`, `linkType`, `newTab`, `url`) and the document a relationship or upload node refers to come from the posted state, and Payload populates them with the access of the user. Called from your Server Action, `readUnsavedRichText` therefore resolves a reference the editor has just added; the endpoint does not, see [How the page is allowed to read the unsaved value](#how-the-page-is-allowed-to-read-the-unsaved-value).
- **It reads as the signed-in user.** The user comes from the request headers through `payload.auth`. The argument of an action is checked before anyone is signed in; the body of a `Request` is read only for a signed-in user, with a size limit. The document is read as a draft, in the locale of the request, with `overrideAccess: false`, and Payload populates uploads, relationships and links with that user's access. Nothing is written.
- **The answer is the value of the field with the markers of a draft read, or `null`.** `null` for a malformed argument, no user, a user who may not read the document or field, an auth collection, a value whose structure is not the posted one, a request a newer one for the same field replaced, and an answer that took longer than `timeLimitMs`. It does not throw: a read that throws, for example in a hook of your project that cannot handle the unsaved state, goes to `payload.logger.error` and answers `null`.

Two cases never reach it: Next.js answers 500 itself for an action body over its limit (1 MB by default, `serverActions.bodySizeLimit`) and for a body it cannot decode.

| `readUnsavedRichText` argument | Purpose |
|---|---|
| `payload` | The Payload instance. |
| `request` | The argument `LiveRichText` passed to the action, or the `Request` a route handler received. Untrusted input: hand it over as it is. |
| `headers` | The headers of the request, with the argument of an action. The user is read from them. A `Request` brings its own. |
| `depth` | The `depth` your page reads the document with, so populated documents have the same shape: a number, or a function of the validated field (`{ collectionSlug, kind, docId?, key }`). Payload's default when omitted. |
| `maxStateLength` | Longest accepted editor state, in characters of JSON. |
| `timeLimitMs` | How long reading the body of a `Request`, signing in and reading may take before the answer is `null`. `DEFAULT_UNSAVED_READ_TIME_LIMIT_MS`, 3000. |
| `readWholeDocument` | `true` reads every field of the document, as 1.2.0 did. By default only the top-level field that holds the rich text is read, see [Upgrading from 1.2.0](#upgrading-from-120). |

During that read your own hooks and access functions see the unsaved state as if it were stored: collection and field `afterRead` hooks, anything that caches by document id inside the read. `isUnsavedRichTextRead(req)`, exported from the main entry, tells such code that the read is one of these. The read selects only the top-level field that holds the rich text (`layout` for a rich text in a block of `layout`), so a hook that reads other fields of the document sees them missing; pass `readWholeDocument: true` for such a hook.

What this costs: one Server Action call per structural edit, never one per keystroke. Each call posts the editor state of that field and reads the top-level field that holds it once. The draft mode check stays in your action because it is specific to Next.js; `readUnsavedRichText` does not depend on Next.

#### Rendering on the page with `renderValue`

With a Server Action alone a structural edit shows one round trip after the admin posts it. When your rich text renderer can run as a Client Component, pass it as `renderValue` and the page shows the structure as it arrives: it builds the value Payload would answer from the posted editor state and data Payload already gave the page, with the same markers and `_meta`, and renders it with your function. A function cannot cross from a Server Component to a Client Component, so `renderValue` is set in a client module of your site:

```tsx
// components/RichText/LiveBody.tsx
'use client'

import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { ReactNode } from 'react'

import {
  LiveRichText,
  type LiveRichTextIdentity,
} from '@focus-reactive/payload-plugin-visual-editing/client'

import { RichTextBody } from './Body'
import { renderUnsavedRichText } from './renderUnsavedRichText'

export const LiveBody = (props: LiveRichTextIdentity & { children: ReactNode }) => (
  <LiveRichText
    {...props}
    action={renderUnsavedRichText}
    renderValue={(value: SerializedEditorState) => <RichTextBody content={value} />}
  />
)
```

```tsx
// components/RichText/index.tsx
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'

import { liveRichTextOf } from '@focus-reactive/payload-plugin-visual-editing/client'

import { RichTextBody } from './Body'
import { LiveBody } from './LiveBody'

export const RichText = ({ content }: { content: SerializedEditorState }) => {
  const body = <RichTextBody content={content} />
  const liveRichText = liveRichTextOf(content)
  return liveRichText ? <LiveBody {...liveRichText}>{body}</LiveBody> : body
}
```

Where the check with the server goes depends on `payloadApi` of `VisualEditing.Provider`:

| Setup | On the page | Check with the server |
|---|---|---|
| `action` | nothing | 200 ms after the first new structure, as above |
| `action`, `renderValue` | at once | the action, 350 ms after the last structure; its result replaces the render on the page |
| `action`, `renderValue`, `payloadApi` | at once | the `unsaved-rich-text` endpoint, 350 ms after the last structure, rendered with `renderValue` |

```tsx
<VisualEditing.Provider available={isEnabled} payloadApi="https://cms.example.com/api">
```

A provider that is given `adminOrigin` finds the API at `<adminOrigin>/api` on its own.

- **With `payloadApi`** the page asks the endpoint with the preview grant the admin posts, as a page without React does, see [How the page is allowed to read the unsaved value](#how-the-page-is-allowed-to-read-the-unsaved-value). The answer goes through the same `renderValue`, so React updates the elements in place and nothing changes on screen when Payload agrees. The call is a `fetch`: it can be cancelled and does not hold `router.refresh()` back. While the page holds no grant, the action is called.
- **With the action alone** its result replaces the render on the page after the pause. It renders on the server, so React mounts its elements anew: the page looks the same, but an `iframe` in a block loads again. An action that returns `null` leaves the render on the page.
- **A field with blocks, uploads, relationships or links to documents** needs its saved value for the fields of saved blocks and the documents Payload populated. With `payloadApi` the page asks the endpoint for the saved value of that field once the editor types in it or changes its structure, and adds every answer Payload gives; when the saved value arrives, the structure the editor holds renders on the page. Without `payloadApi`, such a field waits for the action. A save forgets every saved value; the page asks again when a structure with blocks, uploads, relationships or links to documents needs it. A structure without them never needs one. A newly inserted upload or relationship appears with the answer of the server, a new link to a document links to its id until then, and a new block shows only its id and type.
- **The same renderer on the client and on the server.** `renderValue` must render the same markup for the same value as the component your page and your action render with, best the very same component. Markup that differs swaps once the server answers.
- **`renderValue` runs in the browser** with a value that did not pass through your Payload hooks. When it throws, or the elements it returns throw while rendering, that structure shows the saved render and waits for the server.
- An identity printed by `liveRichTextOf` of 1.2.0, without `meta` and `hasReferences`, waits for the server.
- **After a save that renders the page again**, the children you pass are the saved render. Until they change, for example in a popup preview that does not refresh, `LiveRichText` takes the render it showed for the structure the editor saved as the saved render.

### Markers in rich text

With `instantPreview` on, a draft read puts a marker of roughly 50 to 60 zero-width characters into every non-empty text node of every Lexical rich text field the editor can change. `excludeValues` does not apply to them. Reads with `locale: 'all'` and rich text in a row without an `id` get none.

The overlay removes these markers from the text inside `VisualEditing.Overlay`. Code that derives something else from rich text on a draft read (heading ids, slugs, excerpts, reading time, plain text, JSON-LD) receives them. Clean the value first with `stripMarkers`. It takes a string or any JSON value and returns a copy of the same shape in which no string carries a marker; a value without markers comes back with the same content, so it is safe on published reads too. It copies plain objects and arrays only: a `Map`, a `Set` or a class instance is returned as it is.

```ts
import { stripMarkers } from '@focus-reactive/payload-plugin-visual-editing'

const minutes = readingTime(stripMarkers(post.content))
const excerpt = stripMarkers(post.excerpt)
```

`vercelStegaClean` from `@vercel/stega` gives the same result for a JSON value without `_meta`. It serialises the value through JSON, so it turns a `Date` into a string and drops `undefined`. Or keep the field out with `excludeFieldNames`, which also ends click-to-edit for it.

### Opting out

A render can transform a value and still output the stored text for some inputs, such as a lowercase transform on a title that is already lowercase. Put `data-ve-live="off"` on the element or an ancestor to keep instant preview away from it. Click-to-edit keeps working there.

```tsx
<h1 data-ve-live="off">{title.toLowerCase()}</h1>
```

### Limitations

- Markup that the page turns into elements shows as typed until the save: if a heading renders `*accent*` as `<em>`, the asterisks appear as characters while you type.
- Payload's Lexical field passes its value to the form when the browser is idle, not on the keystroke itself, so rich text can reach the preview later than a text field. The plugin cannot shorten that.
- A renderer that joins several text nodes of rich text into one DOM text node, or changes their text, leaves that text to the save.
- Rich text that is not wrapped in `LiveRichText`:
  - While a structural edit is unsaved, the preview shows the structure of the last save, with the text its text nodes had when the structure changed. Whatever is typed after that edit appears once the autosave has landed and the page has rendered it. A preview page that loads during that time shows the saved text.
  - When a structural edit is undone before its save has landed (Enter, then Backspace, then more typing), the text typed after the undo is live at first. Then the save of the undone edit lands and the page renders it: the structure and the text of that save, which is older than what the editor holds. The preview shows that until the next autosave lands and is rendered, usually a few seconds. The plugin does not carry text from one structure of a field to another: a saved editor state identifies a text node by its position only, and matching nodes by position or by text could put text in the wrong place.
- Rich text in `LiveRichText`:
  - With `action`, the setup needs the App Router and a Server Action. The Pages Router has none: pass `render` with a transport of your own, and with `renderValue` and `adminOrigin` (or `payloadApi`) the page renders a structure itself and checks it through the `unsaved-rich-text` endpoint. A frontend without React uses `./dom`, see [Pages without React](#pages-without-react).
  - While a Server Action call is out, `router.refresh()` waits for it, see [Unsaved rich text structure](#unsaved-rich-text-structure).
  - A Server Action is called with the cookies of the preview page. A preview on another origin than the admin has no Payload session there; the answer of the action is `null`. Such a page passes `renderValue` and `adminOrigin` (or `payloadApi`): the endpoint is asked with the preview grant, which needs no session, see [How the page is allowed to read the unsaved value](#how-the-page-is-allowed-to-read-the-unsaved-value). Without them the structure appears with the save.
  - Without `renderValue`, a structural edit is on screen one round trip after the admin sees it. Until then, and after a failed call, the preview shows the saved render. Text typed meanwhile is painted into the new render when it arrives.
  - The fields of a block inside rich text are never posted: the admin has no schema of the blocks of an editor, so it cannot tell which of their fields may leave the form. A block that is already saved is rendered with its saved fields, a new block with none, and an edit of a block's fields shows with the save.
  - The unsaved state is rendered as the editor holds it. Hooks that change a value on save (`beforeValidate`, `beforeChange`) have not run yet; their effect shows with the save. Hooks that run on read see the unsaved state, see `isUnsavedRichTextRead` above.
  - An editor state longer than `maxStateLength` is not rendered before the save.
  - A field the page renders twice makes two calls per structural edit, one per place.
- After the admin switches to another locale, instant preview resumes when the preview has loaded a page again. Payload reloads the Live Preview for the new locale; a popup preview window that was opened before the switch is sent nothing.
- After a client-side navigation inside the preview, fields of pages visited earlier stay on the admin's list until the preview does a full page load.
- In the popup preview window the admin cannot see a navigation. It keeps sending the listed fields to the popup until a page there reports its fields again or the popup is closed.
- The popup keeps unsaved text on screen after you leave the document without saving. It shows the saved content again when it reloads.
- While the preview shows fields of the open document, every change in the form reads the whole form state before the admin paints. On a form with several thousand fields this costs a few milliseconds per keystroke. With Live Preview closed it costs nothing.

## Editing on the page

With it the editor types into plain text on the page itself, writes and formats rich text in place and replaces an image from the page. The text, the rich text and the image go into the draft; the published document changes only on publish. It needs [instant preview](#instant-preview) and is off by default.

Turn it on in the plugin, regenerate the import map, and offer it on the page:

```ts
// payload.config.ts
visualEditingPlugin({ instantPreview: true, inlineEditing: true })
```

```tsx
<VisualEditing.Provider available={isEnabled} inlineEditing adminBasePath="/admin">
```

Without React pass `inlineEditing: true` to `mountVisualEditing`.

Rich text is edited on the page only when the site also hands the page its editor, from a Client Component or from the script that mounts the page:

```tsx
<VisualEditing.Provider
  available={isEnabled}
  inlineEditing
  richTextEditor={() => import('@focus-reactive/payload-plugin-visual-editing/rich-text')}
>
```

```ts
mountVisualEditing({
  inlineEditing: true,
  richTextEditor: () => import('@focus-reactive/payload-plugin-visual-editing/rich-text'),
})
```

Without `richTextEditor` a click on rich text opens the field in the admin, and the page loads nothing of Lexical.

Editing on the page then runs whenever the toggle is on **Hover** or **Always**; there is nothing more to turn on. The toggle starts on **Hover** for an editor who has not picked a mode on the site yet, so the page can be edited at once. On **Off** the page shows no frames and edits nothing, as without visual editing; an editor who picked **Off** keeps it.

### Using it

- An edit on the page leaves the form of the admin where it is: it is not scrolled to the field and nothing in it takes the focus, so the Live Preview frame does not move under the pointer. A click that opens the field in the admin still shows it there.
- A click on plain text puts the caret into it. Enter ends the edit, Escape brings back the text the edit began with, and a click elsewhere ends the edit. Escape saves that text only when a typed one was already sent; a typed text that still waited is dropped, and nothing is saved. In a `textarea` field Shift+Enter starts a new line in a browser that supports `contenteditable="plaintext-only"`; elsewhere it ends the edit. A `text` or `email` field stays one line on the page as it is saved: Shift+Enter ends the edit as Enter does, and a line break in pasted, dropped or dictated text shows as a space.
- With `richTextEditor` set, a click into rich text is taken by the page at once. The page asks for the state of the field (it already does when the pointer moves over the rich text) and puts the caret at the text position that was clicked as soon as the state is there; a click beside the text, or on a block, puts it at the nearest text. While the page waits for the state, the rich text shows a dashed outline in the accent colour (`data-ve-edit-starting`). When the field cannot be edited on the page, or no answer comes within four seconds, the field opens in the admin instead; in a tab of its own a browser may block that late tab as a pop-up, and the **Edit** badge opens it. The text is edited in the styles of the site. Enter starts a paragraph, Escape brings back the state the edit began with, a click outside the rich text and its toolbar ends the edit, and Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z undo and redo inside the edit.
- While rich text is edited, a toolbar sits above its top left corner. When there is no room above it, as when the text starts at the top of the window, the toolbar sits below the text, and at the top of the window when there is no room below it either. It follows the rich text as the page scrolls and is hidden while the rich text is out of the window, unless its address field is open. Where the visual editing toggle would cover it, it moves to the left of the toggle, or below it when there is no room beside it. It holds the formats the field allows, out of **Bold**, **Italic**, **Underline**, **Link**, **H2**, **H3**, **Bullet list** and **Numbered list**. Each button shows whether the selection has the format and turns it on or off. Cmd/Ctrl+B, I and U do the same from the keyboard. **Link**, or Cmd/Ctrl+K, opens an address field in the toolbar: Enter links the selection, an empty address removes the link, Escape closes the field, and both leave the text selected that was selected when the field opened. An address must start with `http:`, `https:`, `mailto:` or `tel:` or be relative; anything else is refused, and the toolbar says so in words under the field. Without a selected range **Link** and Cmd/Ctrl+K do nothing. The toolbar is never wider than the window less 8 px on each side: its buttons wrap, the address field takes a row of its own, and it stays inside the window.
- A paragraph that begins with `# ` to `###### `, `- `, `* `, `+ `, `1. ` or `> ` becomes a heading, a bullet list, a numbered list or a quote as soon as the space is typed, when the field allows that block.
- An icon the site renders as the first element of a list item (an `<svg>` or an `<img>`) is drawn in the edited list as well, from the first item of each kind of list.
- Spaces are shown as the site shows them. Where the first element the site rendered collapses white space (`white-space: normal` or `nowrap`), runs of spaces, spaces at the start and end of a line and spaces around a line break are dropped from the text when the edit begins, so the lines stay where they were; text formatted as code keeps its spaces. The first change you make saves the text that way. Where the site keeps white space (`pre`, `pre-wrap`, `pre-line`, `break-spaces`), nothing is dropped. A line break that ends a paragraph or a list item adds no empty line, as on the site, until the caret is put after it. The twin also takes the `word-break`, `overflow-wrap` and `line-break` of that element, which the editor and the browser would otherwise replace.
- The text keeps the direction of the site. The edited elements carry no `dir` of their own, so `direction`, `unicode-bidi` and `text-align` come from the styles of the site, and a `dir` the site wrote on the element that holds the rich text is kept. The `direction` the state stores is saved as it is, as the admin saves it.
- A paste keeps what the field allows. A heading of a size the field does not have, a quote or a list in a field without them becomes paragraphs, a format the field does not have is dropped, and a pasted link arrives as its text.
- A block, an inline block, an upload, a relationship, a horizontal rule, a table and every other node the page cannot edit is fixed: its content is never changed on the page. At the top level it shows as a copy of what the site rendered for it, which takes no click and no focus; where the page cannot tell which element that is, and inside a paragraph, it shows as a dashed placeholder with the name of its type.
- A fixed node can be deleted, in two steps. A click on it, or Backspace or Delete with the caret next to it, selects it, with an outline in the accent colour; Backspace or Delete then removes it. Cmd/Ctrl+Z and Escape bring it back. Nothing else removes it: a selection that spans it and is deleted, cut or typed over loses its text and keeps the node, and it cannot be cut, copied in, dragged or moved past another one. Backspace at the start of the paragraph after it never touches the text before it. Add and reorder blocks in the admin.
- A line of text that is all its block holds, such as a `<span>` in a heading, is framed and edited as that block: a click anywhere in the block puts the caret at the nearest text, and the frame is one rectangle while the text wraps over several lines.
- In a button or a link that holds more than the text, such as an accordion header with an icon, only a click on the text edits it. A click beside the text is left to the page, so the accordion still opens.
- The lines of the text stay as the page broke them until the first key press, paste, cut, drop or typed text. A long word breaks where the page broke it for the whole edit. From the first change on the browser keeps every space and line break of the text, so a text with two spaces in a row, or with a line break the page does not show, can wrap at another place while it is edited.
- The **Edit** badge still opens the field in the admin form.
- A pasted text arrives without its formatting.
- An image that names a single upload field shows a **Replace image** button while the pointer is over it, in its top left corner, or in the top left corner of the part of it in the window when the image is scrolled past its top or its left. The button opens a list of the media of that field's collection, where a new file can be uploaded too. The picked image shows on the page at once, at the address `buildImageUrl` gives for it when the page passes that option; an image found by its description (see [What gets a marker](#what-gets-a-marker)) also shows the description of the picked media in its `alt`, read from the field `imageDescriptionField` names, or an empty `alt` when the picked media has none; when its save fails, the page shows the image it had again, and a **Retry** that saves shows the picked one. A click on the image itself still opens the field in the admin form, and so does the button when the field turns out to take no media from the page.
- A status in the bottom right corner says **Unsaved changes**, **In the admin form, not saved yet**, **Pick the image in the admin window**, **Saving…**, **Saved** or, with a **Retry** button, why a save was refused: **Locked by another editor**, **This content has no drafts**, **This field cannot be edited here**, **Sign in to the admin to edit**, or **Not saved** for anything else. The form of the admin gives the same reasons: **This field cannot be edited here** for an edit or a pick it cannot write, **Not saved** for a pick while its drawer is open or of an image it could not read. A refusal stays on screen while other fields are edited and saved, until a **Retry** saves the edit or a newer edit of the same field replaces it. **Changed elsewhere, reload the page** comes with a **Reload** button instead: the field was saved somewhere else after the page showed it, see [Limits](#limits). Nothing more of that field is sent until the page is reloaded, and a newer edit of it does not clear the status.

### Where an edit is saved

| The page is | The edit goes to | Saved by |
|---|---|---|
| in Live Preview, and the form of the document is open | the admin form, as if the editor had typed there or picked the image there; the status says **In the admin form, not saved yet** until the document is saved | Payload: autosave, or the editor's own **Save Draft** |
| in a tab of its own, in draft mode | `POST <payloadApi>/visual-editing/field-edit` with the editor's session | the endpoint, into the latest draft |
| in a window the admin opened, such as the tab of Payload's **Preview** button | the endpoint, as in a tab of its own, until the admin sends that window the values of a form; the pop-up window of Live Preview gets them and writes into the form. An edit keeps the route it began with: one begun before the values arrived is saved through the endpoint to its end, and one begun in the form is saved through the endpoint once the window of the admin is closed | as in the row that applies |

In the pop-up window of Live Preview, as in its frame, **Replace image** opens the drawer of the admin that holds the form, in the admin's own window, so the page asks the API of Payload nothing across origins. The admin brings its window to the front as it opens the drawer, and the pop-up says **Pick the image in the admin window** until the pick is made, cancelled or left unanswered for a minute. The list on the page is drawn only on a page without a window of the admin.

The endpoint takes `{ collectionSlug, kind, docId, key, locale, value }` for text and for an image, and `{ …, state }` with a serialised Lexical editor state for rich text. Text and rich text also carry `base`, the text or the state the edit began from, and an image the id of the media the page showed when its element carries `data-ve-value-id`. Text and rich text may carry `sentBefore` too, the value of an earlier save of the same edit that is still on the way when the tab is hidden or closed and may land first; the endpoint saves when the draft holds either. The endpoint saves the edits of one document one after the other, so two saves of rows of one list or blocks of one layout that arrive together keep both. It reads the latest draft with the user's access, changes the one field and saves a draft with `overrideAccess: false`. It answers `{ saved: true, autosave }`, with `autosave` whether the drafts of the document autosave, and with `value`, what the field holds after the save, when the edit carried a `base`; or `{ saved: false, reason }` with a status: `401` and `signed-out` without a user, `409` and `no-drafts` for a collection or global without `versions.drafts`, `412` and `changed` when the draft no longer holds the `base` of the edit, `422` and `not-editable` for a field the editor cannot reach (also `403` and `404`), `423` and `locked` for a document another editor holds a lock on, `400` and `unreadable` for a body it cannot read (a `state` sent as a JSON string, or a body sent with another `Content-Type` than `application/json`, for example), and `failed` for everything else, also a read or save that throws. It never publishes. For an upload field the value is the id of a media document; the endpoint takes it only when the user can read that document in the collection of the field.

Rich text needs the stored state of the field before it can be edited, and where it comes from depends on the page as well:

| The page is | The state comes from | With |
|---|---|---|
| in Live Preview, and the form of the document is open | the form: the page posts `ve:rich-text-state-request`, the admin answers `ve:rich-text-state` | the fields of blocks left out, as in [what is sent to the preview](#what-is-sent-to-the-preview) |
| in a tab of its own, in draft mode | `POST <payloadApi>/visual-editing/rich-text-value` with the editor's session | the value of the draft, read with the user's access at depth 0 |

`rich-text-value` takes the document, the field and the locale, runs the checks of `field-edit` and answers `{ value, formats }`, or `{ value: null, formats: null, reason }` with the status and the reason `field-edit` would answer. For a field of a row or a block that neither the draft nor one of the latest 20 versions of the document holds, it answers `200` with `{ value: null, formats: null }` and no reason; a row another editor removed, or a group or a row the user may not read, is refused. `formats` are the formats the editor of the field allows (`textFormats` as Lexical's bit mask, `headings`, `lists`, `hasLinks`, `hasQuotes`), read from the field's Lexical editor config, plus every format the stored value already holds. The form answers the same formats: the admin asks `rich-text-value` for them when the page asks for the state, and adds every format the form holds. When the endpoint answers no formats, for a field of a row that is not saved yet for example, or cannot answer, the form offers only the formats its state holds. A request the form cannot answer, also for a field whose `access.update` refuses the user, gets `ve:rich-text-state-refused` with `reason: "not-editable"`.

Neither path trusts what the page sends back; the endpoint and the form apply the same rules, and an edit that breaks one is refused whole (`422`, or `ve:field-edit-refused` with `reason: "not-editable"`):

- The state is valid JSON of at most 1,000,000 characters, holds a `root` and nothing beside it, and no key named `__proto__`, `constructor` or `prototype`.
- **The nodes the page cannot edit are fixed, and may only be left out.** Their sequence in the posted state must be a part of their sequence in what the user was shown, in the same order: each posted node must equal a shown one that comes after the one matched before it, with the fields of blocks left out on both sides, and sit in a parent of the same type. Nodes are compared as the JSON they serialise to, so a key the admin holds with the value `undefined` counts as missing. The stored node of the matched one is then written, when its `type`, `id` and block type match: so the fields of a block, of an upload or of a relationship never come from the page, and no such node can be added, doubled, swapped, moved into another kind of parent or given another id, collection or document. A node that is not posted is removed.
- **A removed node comes back only inside the edit that removed it.** In a tab of its own what is typed is saved after each pause, but from the moment a fixed node is removed nothing more is saved until the edit ends, so an undo or Escape still has the node to bring back. In Live Preview the admin keeps the state it answered when the edit began until the page posts `ve:rich-text-edit-ended` (on a commit and on Escape) or the document or the locale of the form changes; a posted state may hold any part of the fixed nodes of that state, and gets the node the form holds now, or else the one it held when the edit began, with its fields. After that a node the form no longer holds is refused.
- **Every other node is one the page can edit**: a paragraph, heading, quote, list, list item, link, line break, text or tab, in a place Lexical allows it, with exactly the keys Lexical writes for it and values of their type and range. A text `style` and a node state (`$`) are taken only when the stored value already holds them.
- **Only formats of the field**: a heading size, list type, quote, link or text format outside `formats` is refused.
- **Links**: `url` is a string and, on a custom link, not empty. An address outside the kinds above is taken only on the link that already holds exactly that address in the stored value, by its `id`, and once. Fields of a link other than `linkType`, `url`, `newTab` and `doc` come from the stored link of that `id`.

The admin writes the state into the form as its value and its initial value, so Payload's editor shows it; the endpoint writes it only into a field the plugin lists as rich text, and tells a save Payload dropped from one that landed by comparing what the field stores, whatever order the database keeps its keys in.

After an edit in a tab of its own nothing renders the page again by itself. The page keeps what the editor typed on screen, as a read-only copy in place of the rich text the site rendered, until the site renders that rich text again. A click on that copy edits it again, or, on **Off**, does what a click on the rich text does. Pass `onEdited` to render it: it is called after every save of an edit made on the page in a tab of its own, of text, rich text or an image.

```tsx
'use client'
const router = useRouter()
return (
  <VisualEditing.Provider
    available
    inlineEditing
    onEdited={() => router.refresh()}
    richTextEditor={() => import('@focus-reactive/payload-plugin-visual-editing/rich-text')}
  >
    {children}
  </VisualEditing.Provider>
)
```

In Live Preview `onEdited` is not called: the admin saves, and the page follows it as it does for an edit made in the form. There a new paragraph, list or format shows on the page before the save only for rich text rendered through [`LiveRichText`](#unsaved-rich-text-structure) or `renderRichTextValue`; other rich text shows the typed text and gets its new structure with the render after the save.

Where the image is picked depends on the page too:

| The page is | The media is picked in | Listed by |
|---|---|---|
| in Live Preview, and the form of the document is open | Payload's own list drawer of the collection, opened in the admin | Payload |
| in a tab of its own, in draft mode | a picker the plugin draws on the page: thumbnails, a search by file name, **Upload new** | `POST <payloadApi>/visual-editing/media-options` with the editor's session |

In Live Preview one drawer is open at a time: a request for another image while it is open is refused. A drawer closed without a pick changes nothing on the page. The page asks once per image while its drawer is open; it asks again when the admin went to another document, when the window it asked was closed or replaced, or a minute after a request the admin never answered. A pick written into the form counts as unsaved until the admin saves that document; a save of another document does not settle it. When the form cannot take a request for the drawer, the page opens the field in the admin and shows no status, as it does when `media-options` refuses the field. In the pop-up window, where the image is picked on the page, a pick the form refuses shows **Not saved**, and **Retry** asks the admin again for the same image, without a drawer.

`media-options` takes the document, the field, the locale, a search and a page number. It checks the field as `field-edit` does, refuses a user who may not update the document with `403` and `not-editable` before anything can be uploaded, lists the collection of the field with the user's access (`overrideAccess: false`), 24 documents a page, and answers `{ collection, documents, hasNextPage }`; a document is `{ id, filename, url, thumbnailUrl, width, height, alt }`, with `alt` only when the collection has a text field of that name. A refusal is `{ collection: null, documents: [], hasNextPage: false, reason }` with the status and `reason` `field-edit` would answer; the picker opens the field in the admin for `not-editable`. **Upload new** posts the file to Payload's own REST API, `POST <payloadApi>/<collection>`, so the access, the hooks and the validation of the collection apply. The picker posts the file and no other field, no `alt` either: a collection whose required fields are filled by a hook or a default value takes the file (a `beforeValidate` hook that writes the file name into `alt`, for example), and when Payload refuses it, because nothing fills a required field, the picker shows Payload's message and the file is uploaded in the admin instead. After **Load more** the focus is on the first document that was added, after an upload on the uploaded one, and the picker keeps its size whatever it lists.

In a tab of its own every save of a text or rich text edit names what it began from: the first save the value the page showed, or the state `rich-text-value` answered when the edit began, every later save of the same edit the `value` the endpoint answered for the last one. A replaced image names the media the page showed, which `withVisualEditingPath` writes as `data-ve-value-id`. When the draft holds something else, because the field was saved in the admin or in another tab meanwhile, the endpoint saves nothing and the status says **Changed elsewhere, reload the page**. A text the page shows from a fallback locale counts as what it began from. A state of a rich text the page was given more than two seconds before the click is asked for again, so a page that stayed open does not begin from an old one.

In a tab of its own a text edit is saved two seconds after the last keystroke, when the edit ends, and when the tab is hidden, closed or navigated away before that. A rich text edit is saved the same way, two seconds after the last keystroke, when it ends by a click outside, and when the tab is hidden, closed or navigated away, which ends it. Escape saves the state the edit began with when a typed one was already saved. Once a fixed node was removed, the edit is saved only when it ends, and until then the status says **Unsaved changes**. A picked image is saved at once, without the text edits that still wait. Each save of a collection or global without `versions.drafts.autosave` adds a version, as a save in the admin does, so the endpoint tells the page whether the drafts of the document autosave (`autosave` next to `saved: true`); once it said they do not, the page saves an edit of that document only when it ends, or when the tab is hidden or closed, not on every pause, and the status says **Unsaved changes** until then. That is one version per edit, and one more for the first pause of the first edit of the page. Payload's own `autosave` flag does not help here: on such a collection it still adds a version per save. A field whose `access.update` refuses the user is answered `422`: the endpoint refuses a save that left the stored value as it was although another one was sent. A value a field hook trims or reformats on the way in counts as saved. The value of the top-level field is read through its `afterRead` hooks and written back, so a hook that masks or reformats a sibling value there has that result saved.

On a project with locales the page must name its locale: pass `locale` to `VisualEditing.Overlay` or `mountVisualEditing`. An edit without a locale is refused, by the form and by the endpoint, so it never lands in the default locale by accident. Text shown from a fallback locale is saved into the locale of the page.

When the form cannot take an edit, for example because the row was removed in the admin meanwhile or the `access.update` of the field refuses the editor, the status says **Not saved**.

In a tab of its own the request carries the editor's cookie, and so do the list of media and the upload of **Replace image** there. When the site and Payload are on different origins, list the origin of the site in `cors` and `csrf` of the Payload config, and the cookie must be sent cross-site. The endpoints read only a body sent as `application/json`, which another site cannot post without a CORS preflight.

### What can be edited on the page

- `text`, `textarea` and `email` fields, also in arrays, groups, tabs and blocks. A line break in a `text` or `email` field is saved as a space, also a line or paragraph separator and the soft break a word processor puts into pasted text. The marker of a `textarea` says that the field holds several lines; a marker without it, also one written by an earlier version, is edited as one line.
- Text that is the only text of its element. It may sit next to other elements, such as an icon or a tag with a field of its own: the text is edited on its own, the caret and a selection stay in it, and the elements beside it stay as they are, each field in its own edit. Typing over a selection that reaches beyond the text, and deleting a word or a line with Option, Ctrl or Cmd and Backspace or Delete, change the text up to its edge and no further. A deletion inside the text is the browser's own; one that reaches the edge of the text is made by the plugin, and undo does not bring it back; an undo of an earlier edit of the browser after such a deletion may land in the wrong place of the text. Text rendered next to other text in the same element opens the field in the admin; wrap the text in its own element to edit it in place.
- An `upload` field of one collection that holds one document, also in arrays, groups, tabs and blocks, where the page marks its image: an `<img>` or a `<picture>` that carries `withVisualEditingPath(value)`, an element that carries it around exactly one `<img>` and no marked text, or an `<img>` whose `alt` is the description of the media read through the field (see [What gets a marker](#what-gets-a-marker)). The field must hold a document already. An image in an array row or a block is addressed by the id of its row: the `_meta` of the upload carries that key (`data-ve-key` on the element) only with `instantPreview` on, which `inlineEditing` needs anyway.
- A `richText` field, also in arrays, groups, tabs and blocks of the document, where the page marks its wrapper with `withVisualEditingPath(value)` or `richTextAttributes(value)`. Paragraphs, headings, quotes, lists, links, line breaks and text with its formats are edited; every other node is kept as it is, or deleted as a whole.
- In Live Preview, only fields of the document whose form is open. Text or an image of another document, such as a header or a related page, opens that document as before.

The new image is shown by its `url`, resolved against the origin of `payloadApi`. The page sets `src`, removes `srcset` and `sizes` from the `<img>` and points every `<source>` of a `<picture>` around it at the same file, so the browser cannot keep an old variant; when the `<img>` has `width` and `height` attributes, `height` follows the proportions of the new file. The variants of the site and the `alt` of the new document come with the next render of the page from the server: after a save in Live Preview where the site reloads on it, or on a reload.

Uploads with `hasMany` or several collections, uploads with `filterOptions`, uploads inside rich text, relationships, numbers and selects open the field in the admin. A draft save runs no validation, so an image picked on the page for a field with `filterOptions` could be one the field forbids, and publishing would fail. So do values read with `locale: 'all'`. An empty field has no element on the page and is filled in the form.

Rich text is not edited on the page, and a click on it opens the field in the admin, when:

- the page was given no `richTextEditor`;
- it was read with `locale: 'all'`;
- its wrapper carries no `data-ve-*` attributes, so the page cannot tell which field it is;
- the plugin does not list the field as rich text: a hidden, read-only or excluded field, or one the user may not read;
- the stored state is not a valid editor state, or holds a node where Lexical cannot hold it;
- it is the rich text of a block inside another rich text: that block is a placeholder of the outer one;
- it holds no value yet in any locale, or it shows a fallback locale that holds a node the page cannot edit: the locale of the page stores no such node, so the save is refused.

Known limits of an edit that does run:

- In Live Preview every pause in the typing writes the state into the form, and Payload's rich text editor in the admin mounts again each time, so a caret or an open drawer inside that field of the admin is lost while the page is typed into.
- In Live Preview a field of a row that is not saved yet offers only the formats it already uses, see above.
- The edited rich text takes the class of each kind of element from the first one of that kind the site rendered, so two paragraphs the site gave different classes look alike while they are edited.
- A rich text that holds nothing but blocks has no place for the caret.
- Clicking the box of a check list item does not tick it.

While a field is edited the page sets `contenteditable`, `spellcheck="false"` and `data-ve-editing` on its element, for text and for rich text alike, and removes them when the edit ends. When the text shares its element with other elements, such as an icon or a tag, those elements get `contenteditable="false"` for the edit and keep their place: the text is edited where it is, in the node the page rendered, so a framework that renders the element, such as React, finds its nodes as it left them. `[data-ve-editing]` gets an outline in the accent colour while the pointer is not over it.

Rich text is never edited in the element the site rendered, which React or your renderer owns. The page hides that element with an inline `display: none`, puts a twin after it, with the same tag and the same `class`, and edits there. When the element that carries the `data-ve-*` attributes holds the rendered nodes in an element of its own, such as `div[data-ve-path] > div.prose > (h2, p, …)`, the twin copies that chain: the page walks down through elements that hold exactly one element and no text of their own, stops before a `p`, `h1`…`h6`, `ul`, `ol`, `blockquote` or an element with text, copies the tag and the `class` of each one, without `id` and `data-ve-*` attributes, and edits in the innermost copy. Classes, the copies of fixed nodes and the caret are then taken from that innermost element; the twin carries `data-ve-editing`, and the read-only copy a tab of its own keeps after the edit carries `data-ve-edited`. Styles that reach the rich text through its class apply to the twin; styles that reach it through an `id`, or through `:first-child` and the like on the wrapper, do not. Inside the twin every paragraph, heading (`h1` to `h6`), quote, list, list item, nested list, link and bold, italic, underlined, struck through or code text gets the `class` of the first element of that kind the site rendered in the wrapper (`p`, `h1`…`h6`, `blockquote`, `ul`, `ol`, `li`, `a`, `strong`/`b`, `em`/`i`, `u`, `s`/`del`, `code`); a kind the wrapper does not show gets none. Underline and strikethrough also get the classes `ve-rich-text-underline` and `ve-rich-text-strikethrough` and a style of the plugin. A fixed node at the top level shows as a deep copy of the element the site rendered for it, when the wrapper has exactly as many child elements as the rich text has top-level nodes: the copy is `inert`, sits in a `contenteditable="false"` element, and carries no `id` and no `data-ve-*` attribute, so a style that reaches the original through an `id` or a child combinator of the wrapper does not reach it. With both, the twin takes the room the wrapper took.

### Limits

- **Editing in a tab of its own while the same document is open in the admin.** The form of the admin does not learn of a save made through the endpoint. It keeps the values it loaded, and its next save or autosave writes them over the edit of the page, without a notice in the admin, as two admin tabs of one document do to each other. Payload's lock does not prevent it: it is released between autosaves, and it is not held against the same user. The other way round the page is told: a field saved in the admin after the page showed it is not saved over, and the page says **Changed elsewhere, reload the page**. While the admin has the document open, edit it in Live Preview, where the edit goes into that form.
- **Replace image is reached with the pointer.** The button is in the tab order only while the pointer is over its image. From the keyboard the image is replaced in the form.

### The Lexical packages

The editor is Lexical 0.50 without React, the version Payload's own rich text field uses from 3.90 on, so the state is edited in the format it is stored in. It lives in its own entry, `@focus-reactive/payload-plugin-visual-editing/rich-text`, and no other entry imports it or Lexical, statically or dynamically: a site that does not pass `richTextEditor` bundles none of it and needs none of the packages.

A site that passes `richTextEditor` needs the six packages where its bundler can resolve them. A frontend in the same project as Payload 3.90 or newer usually has them through `@payloadcms/richtext-lexical`; a frontend of its own, or a package manager that does not hoist, installs them:

```bash
bun add lexical@0.50.0 @lexical/rich-text@0.50.0 @lexical/list@0.50.0 @lexical/history@0.50.0 @lexical/selection@0.50.0 @lexical/utils@0.50.0
```

`@payloadcms/richtext-lexical` before 3.90 uses Lexical 0.41. A site on Payload 3.79 to 3.89 that imports `./rich-text` installs Lexical 0.50 next to it: a second copy, used only by the chunk of the page that edits rich text, while the admin keeps its own. A site that does not import `./rich-text` is not affected.

Written as `() => import(…)`, the entry becomes a chunk of its own that the page loads on the first pointer move over rich text that can be edited: about 83 kB gzipped (255 kB minified), once.

## Pages without React

`./dom` runs the same overlay, mode toggle and instant preview on a page that has no React: a static site generator, server templates, Vue, Svelte. It does not import React. The server half and the admin are the same as above.

### 1. Read drafts over HTTP with the header

A page that reads Payload through REST or GraphQL asks for markers with the `x-visual-editing` header on a draft read (`draft=true`). Only the presence of the header counts, its value does not. The read is marked only for a signed-in user, so send the session of a Payload user with it.

```ts
const response = await fetch(`${CMS_URL}/api/pages?where[slug][equals]=home&draft=true`, {
  headers: { Cookie: session, 'x-visual-editing': '1' },
})
```

A published read, a read without the header and an anonymous read get no markers. Leave the header out of production builds.

A build or a preview function has no browser session, so it signs in as a user of its own, best a service user that may read drafts and nothing else. Any way Payload authenticates a request works:

- Log in once with `POST /api/users/login` (`{ email, password }`) and send the `token` of the answer as `Authorization: JWT <token>` or `Authorization: Bearer <token>`, or as the `payload-token` cookie.
- With `auth.useAPIKey` on the users collection, send `Authorization: users API-Key <key>`.

`enrichment: 'explicit'` does not turn these reads off: it is about Local API reads, and the header is already an explicit request.

### 2. Mount it on the page

Load this only in the preview, after the page has rendered:

```ts
import { mountVisualEditing } from '@focus-reactive/payload-plugin-visual-editing/dom'

mountVisualEditing({
  adminOrigin: 'https://cms.example.com',
  framedOnly: true,
  locale: 'en',
  onSave: () => location.reload(),
})
```

| Option | Default | Purpose |
|---|---|---|
| `root` | `document.body` | Element the overlay scans for markers. |
| `available` | `true` | `false` leaves the page alone, for a page read without drafts. |
| `adminOrigin` | the page's origin | Origin of the admin window, with its scheme: `https://cms.example.com`. Required when the admin runs on another origin. A value that is no `http` or `https` URL, such as `cms.example.com`, is ignored: the page then talks to its own origin and asks no `payloadApi`. |
| `framedOnly` | `false` | Only run inside the Live Preview: its iframe or the window it opens. Elsewhere it only removes the markers from `root` and `<head>`. |
| `instantPreview` | `true` | Text typed in the admin appears on the page, once the plugin option is on. `false` keeps the page from listening. |
| `locale` | none | Locale of the page, see [Requirements](#requirements). |
| `inlineEditing` | `false` | Turns on editing on the page in the **Hover** and **Always** modes, see [Editing on the page](#editing-on-the-page). |
| `toggle` | `true` | Shows the Off / Hover / Always toggle. |
| `accentColor`, `accentTextColor` | violet, white | Colour of the frames, the **Edit** badge and the toggle's "on" dot, and of the badge text. Same as on `VisualEditing.Provider`. |
| `onSave` | none | Called after the admin saves the document, autosave included. |
| `onEdited` | none | Called after an edit made on the page in a tab of its own was saved, see [Where an edit is saved](#where-an-edit-is-saved). |
| `richTextEditor` | none | `() => import('@focus-reactive/payload-plugin-visual-editing/rich-text')`. With it and `inlineEditing`, rich text is edited on the page, see [Editing on the page](#editing-on-the-page). |
| `buildImageUrl` | the URL of the media in the Payload API | `(media) => string \| undefined`. The address a replaced image is shown at on the page, for a site that serves its images through its own path or image optimizer, such as `` (media) => `/images/${media.filename}?width=1080` ``. `media` holds the `url`, `width` and `height` of the picked media, and its `id`, `filename` and `alt` when the admin or the API gave them. Without it, or when it returns `undefined`, the page shows the `url` of the media, resolved against the origin of `payloadApi`. |
| `payloadApi` | `<adminOrigin>/api` when `adminOrigin` is set | URL of the Payload REST API, where the page asks the `unsaved-rich-text` endpoint for unsaved rich text. Set it when `routes.api` of your Payload config is not `/api` or the API is served from another origin than the admin; an empty string keeps the page from asking. |
| `renderRichTextValue`, `renderRichText` | none | Unsaved rich text structure, see below. |
| `optimistic` | `true` | With `renderRichTextValue`, render a new structure on the page before the server answers, see [Rendered on the page first](#rendered-on-the-page-first). `false` waits for the server. |
| `adminBasePath`, `buildAdminEditUrl` | as for `VisualEditing.Provider` | |

It returns `{ destroy }`.

What to pass depends on what the page should do:

| Goal | Plugin | `mountVisualEditing` and templates |
|---|---|---|
| Click-to-edit | nothing | `adminOrigin`, when the admin runs on another origin |
| Text shows while it is typed | `instantPreview: true` | `adminOrigin`; `onSave`, or a reload of your own after a save |
| Paragraphs, lists and formatting show before the save | `instantPreview: true` | also `richTextAttributes(value)` on the wrapper of the rich text and `renderRichTextValue`, see [Unsaved rich text on a page without React](#unsaved-rich-text-on-a-page-without-react) |

The toggle starts on **Off**, or on **Hover** with `inlineEditing`, as on a React page: the mode is kept in `localStorage` under `visual-editing`, per origin, so an editor picks **Hover** or **Always** once on each site.

Nothing reloads the page after a save unless you say so. `onSave` is called each time the editor saves the document, autosave included, and never when the page loads; `() => location.reload()` is the usual value. Without `onSave` and without a reload of your own, the page keeps the content it loaded with: typed text stays on screen through instant preview, and everything that waits for the save never appears. A site that already reloads its preview after a save should leave `onSave` out, or it reloads twice.

`onSave` follows `ve:document-saved`, a message the plugin's admin posts after Payload reports a save. The message names the saved document (`collectionSlug`, `kind`, `docId`) and the locale of the admin; `onSave` is called for every one of them, also for a document saved in a drawer. Do not use Payload's own `payload-document-event` for this: Payload also sends it once right after the page reports that it is ready, without a save, and a page that reloads on it reloads once for nothing.

### 3. Mark rich text, uploads and relationships

`withVisualEditingPath(value)` returns the attributes as an object. Print them on the element in your template. For a rich text field that should update its structure before the save, print `richTextAttributes(value)` instead: it adds `data-ve-live-rich-text`, the identity and shape of the saved value. Both functions run in Node, at build time.

A marked text carries invisible characters. Where a template turns text into an `id`, an anchor, a CSS selector or a value it compares, clean it first with `stripMarkers(value)`, also exported from `./dom`: `{{ service.title | stripMarkers | slugify }}`.

```njk
<div {% for name, value in richTextAttributes(page.content) %}{{ name }}="{{ value }}" {% endfor %}>
  {{ page.content | richTextHtml | safe }}
</div>
```

The example relies on Nunjucks escaping what it prints (`autoescape`, on by default and in Eleventy): the value of `data-ve-live-rich-text` is JSON and must reach the page with its quotes escaped. With autoescape off, or in a template language that does not escape, print the value through its escape filter, here `{{ value | escape }}`.

### Unsaved rich text on a page without React

Text typed inside existing text of a rich text field updates through the markers, as on a React page. A new paragraph, a list or a bold word needs your renderer. `./dom` replaces the content of the element that carries `data-ve-live-rich-text` with the HTML of the unsaved value, and puts the saved HTML back when the editor returns to the saved structure. After a save without a reload, the HTML it shows for the structure the editor saved becomes the saved HTML, so the page shows what was saved when the editor returns to it and renders the structure it loaded with as unsaved. Choose where that HTML is made:

| | Where the HTML is made | Plugin | `mountVisualEditing` |
|---|---|---|---|
| In Payload | `renderHtml` in the plugin config | `instantPreview: true, renderHtml` | `adminOrigin` (or `payloadApi`) |
| On the site | your function, from the value Payload reads | `instantPreview: true` | `adminOrigin` (or `payloadApi`), `renderRichTextValue` |
| Anywhere | your own call | as you need | `renderRichText` |

```ts
visualEditingPlugin({
  instantPreview: true,
  renderHtml: ({ value }) => toSiteHtml(value),
})

mountVisualEditing({ adminOrigin: 'https://cms.example.com' })
```

`renderHtml` gets the value with the markers of a draft read, the field, the locale and the request. Render it with the same converter the site uses: the HTML replaces the saved HTML in place, and markup that differs flickers when the saved render comes back. There is no default converter for that reason.

`renderRichTextValue(value, signal)` gets the same value on the page and returns HTML, or a promise of it. `renderRichText(request, signal)` gets the request itself; hand it to `readUnsavedRichText` on your own server.

The HTML of `renderHtml`, `renderRichTextValue` and `renderRichText` is written into the element with `innerHTML`, as it is. The value holds what an editor typed and has not passed the validation of a save, so the renderer must escape every text it prints and check every URL it writes into an `href` or `src` (allow `http:`, `https:`, `mailto:` and relative addresses, refuse `javascript:`), as the renderer of the built site must. `convertLexicalToHTML` of Payload 3.90 escapes text and sanitizes the URL of a link; a converter of your own for a link, an upload or a block has to do both.

`./dom` finds the elements that carry `data-ve-live-rich-text` when `mountVisualEditing` runs. An element added later, by a client-side navigation or a script, is not live: call `destroy()` and `mountVisualEditing` again after the page has replaced its content. Text typed into existing text needs no new mount, the overlay follows the page.

#### Rendered on the page first

With `renderRichTextValue`, the page does not wait for Payload. When the admin posts a new structure, the page builds the value Payload would answer from the posted editor state and data Payload already gave this page, with the same markers and `_meta`, renders it with `renderRichTextValue` and shows it at once. Payload is asked once the editor pauses, 350 ms after the last structure, and its answer replaces the HTML only when it renders differently. Enter followed by the first letter of a new paragraph renders twice on the page and asks Payload once.

- **A field of paragraphs, headings, lists and links to URLs** needs nothing else: no request until the pause, and no `payloadApi` to render on the page.
- **A field with blocks, uploads, relationships or links to documents** needs the saved value of the field, the base, for the fields of saved blocks, uploads and links and for the documents Payload populated. The page asks the `unsaved-rich-text` endpoint for it, without a state, once the editor types in that field or changes its structure, and adds every answer Payload gives for a structure to it. Until the base arrives, a structure of that field goes through Payload as without this option; when it arrives, the structure renders on the page. Without `payloadApi` there is no base, and such a field waits for `renderRichText`. A base that did not arrive is asked for again. A save forgets every base; the page asks again when a structure with blocks, uploads, relationships or links to documents needs it. A structure without them renders on the page without a base, also after a save.
- **What only Payload knows appears with its answer.** A newly inserted upload or relationship is left out until then, a new link to a document links to its id, and a new block shows only its id and type, as it does in Payload's answer before the save.
- **`renderRichTextValue` runs in the browser**, so the converter ships in the bundle of the preview page. `convertLexicalToHTML` from `@payloadcms/richtext-lexical/html` bundles for the browser as it is: `renderRichTextValue: (data) => convertLexicalToHTML({ data })`. It gets a value that did not pass through your Payload hooks. It must render the same markup for the same value as the build of the site does, or the page swaps the HTML once Payload answers. When it throws for a structure, that structure goes through Payload. It may return a promise; the HTML is shown when it resolves.
- **Pass `optimistic: false`** to wait for Payload for every structure, as 1.2.0 did. A page whose `data-ve-live-rich-text` was printed by `richTextAttributes` of 1.2.0 has no `_meta` in it and waits for Payload too; build it again.

`renderHtml` in Payload and your own `renderRichText` cannot render on the page. They start a call 200 ms after the first new structure, as `LiveRichText` does, and gain from the read of one field described in [Upgrading from 1.2.0](#upgrading-from-120).

With both `renderRichTextValue` and `renderRichText`, the page renders a structure itself and checks it as `LiveRichText` does with `renderValue` and an action: through the `unsaved-rich-text` endpoint while it holds a grant, rendered with `renderRichTextValue`, and through `renderRichText` otherwise. Pass `payloadApi: ''` to check through `renderRichText` alone.

#### How the page is allowed to read the unsaved value

The admin and the page often run on different origins, so the page cannot send the admin's session cookie. With `instantPreview` on, the plugin adds two endpoints:

- `POST /api/visual-editing/preview-grant`. The admin asks it, with the editor's session, for a grant of the document open in the form. The grant names the user and the document, expires after ten minutes and is signed with a key derived from the Payload secret. The admin posts it to the preview window, only to the origin of the Live Preview URL: once to every page that loads there or asks for it, and again when it has renewed the grant, which it checks every four minutes while the form is open.
- `POST /api/visual-editing/unsaved-rich-text`. The page posts the grant and the request as `text/plain`, which needs no CORS preflight. The endpoint reads the posted state as `readUnsavedRichText` does, with the access of the user in the grant and only for the document in the grant, and answers the origin of the request. A request without `state` gets the saved value of the field, read the same way. In both answers a relationship, upload or internal link node is populated only when the saved value of the same field refers to the same document (the same `relationTo` and id), and never when it refers to an auth collection or a collection whose slug starts with `payload-`; every other reference stays an id. A reference the editor adds therefore shows on the page after the save. `renderHtml` gets a request whose `user` is the user of the grant. It waits up to eight seconds for the read, longer than the three seconds `readUnsavedRichText` allows by default, because no router queue waits behind a `fetch`. It writes nothing.

A grant is a bearer token: a script on the preview page can read it, as it can read every value the admin posts there. For ten minutes it lets the holder read the rich text fields of one document, saved or with a posted structure, with the access of the user who opened it, together with the documents the saved rich text of that field already refers to, populated as that user may read them. It reads no other field of the document and no document the posted state names on its own. The blocks of a posted state get their fields from the saved document, so what they populate is what the saved document refers to.

## Enrichment modes

`enrichment` decides which reads get markers.

- **`'auto'`** (default): every Local API read with `draft: true` outside the admin base path. The plugin cannot tell a preview render from other server code that reads drafts, so jobs, hooks and scripts get markers too.
- **`'explicit'`**: only reads that pass `context: { visualEditing: true }`.

```ts
const { isEnabled: draft } = await draftMode()

await payload.find({
  collection: 'pages',
  draft,
  context: { visualEditing: draft },
  where: { slug: { equals: slug } },
})
```

In both modes `context.visualEditing` wins when it is set: `true` marks the read, `false` leaves it clean. `true` marks any read it is passed to, also a published one, so pass the draft flag as above and never a constant `true`.

`enrichment` is about Local API reads. A REST or GraphQL draft read that sends the `x-visual-editing` header with a signed-in user is marked in both modes.

A `beforeChange` hook removes intact markers from every write. It cannot recognise a marker that a transformation damaged. If server code reads drafts, changes the text (a translation, a truncation) and writes it back, use `'explicit'` or pass `context: { visualEditing: false }` on those reads.

## Options

| Option | Type | Default | Purpose |
|---|---|---|---|
| `skipCollections` | `string[]` | `[]` | Collections the plugin does not mark. Payload's internal collections are always skipped. |
| `skipGlobals` | `string[]` | `[]` | Globals the plugin does not mark. |
| `excludeFieldNames` | `string[]` | `[]` | Field names that are never marked and never sent to the preview, in addition to `_status`, `folder`, `slug` and `apiKey`. |
| `excludeValues` | `((value: string) => boolean)[]` | `defaultExcludeValues` | Values that are not marked. Replaces the defaults (`isUrl`, `isSlug`, `isHash`, `isIsoDate`, all exported). |
| `adminBasePath` | `string` | `/admin` | Admin base path. Reads from below it are not marked; the bridge uses it to recognise the open document. A slash at its end is ignored. |
| `enrichment` | `'auto' \| 'explicit'` | `'auto'` | See [Enrichment modes](#enrichment-modes). |
| `instantPreview` | `boolean` | `false` | See [Instant preview](#instant-preview). |
| `inlineEditing` | `boolean` | `false` | Adds the receivers of edits, of media picks and of rich text edits to the admin and the `field-edit`, `media-options` and `rich-text-value` endpoints, see [Editing on the page](#editing-on-the-page). Needs `instantPreview`. |
| `renderHtml` | `({ value, field, locale, req }) => string \| Promise<string>` | none | Renders unsaved rich text to HTML for a page without React, see [Pages without React](#unsaved-rich-text-on-a-page-without-react). |
| `readWholeDocument` | `boolean` | `false` | The `unsaved-rich-text` endpoint reads every field of the document instead of the top-level field that holds the rich text. For `afterRead` hooks that need other fields, see [Upgrading from 1.2.0](#upgrading-from-120). |
| `imageDescriptionField` | `string` | `'alt'` | The `text` or `textarea` field of a media document that describes its image; a field of another type describes nothing. Read through an `upload` field, it carries the marker of that field, so an `<img>` rendered with that `alt` is found as the image of the field. An image replaced on the page shows the picked media's value of this field in its `alt`. |

`LiveRichText` props:

| Prop | Purpose |
|---|---|
| `field`, `shape`, `meta`, `hasReferences` | From `liveRichTextOf(value)`: spread its whole result. `field` and `shape` identify the saved value; `meta` and `hasReferences` are what a render on the page with `renderValue` needs, and without them the field waits for the server. |
| `action` | A Server Action that renders the unsaved state. It is called with the request only. |
| `render` | In place of `action`: `(request, signal) => Promise<ReactNode>`, a call you make yourself. |
| `renderValue` | `(value) => ReactNode`, your rich text renderer as a Client Component. Renders a structure on the page as it arrives, see [Rendering on the page with `renderValue`](#rendering-on-the-page-with-rendervalue). |
| `children` | The saved render. |

`VisualEditing.Provider` props:

| Prop | Default | Purpose |
|---|---|---|
| `available` | `false` | Turns the overlay on. Pass the draft mode flag. |
| `framedOnly` | `false` | Only run inside the Live Preview: its iframe or the window it opens. Elsewhere a draft page only loses its markers. |
| `accentColor` | `#7c3aed` (violet) | Colour of the frames, the **Edit** badge and the toggle's "on" dot. Pick one the site does not use, so the frames never blend into the page; a violet brand might take `#ea580c`. Any CSS colour. |
| `accentTextColor` | `#ffffff` | Text on the **Edit** badge. Use a dark colour with a light `accentColor`. |
| `adminBasePath` | `/admin` | Must match the plugin option. |
| `adminOrigin` | the page's origin | Origin of the admin window, with its scheme: `https://cms.example.com`. A value that is no `http` or `https` URL is ignored: the page then talks to its own origin and asks no `payloadApi`. |
| `instantPreview` | `true` | See [Instant preview](#instant-preview). `false` keeps the page from listening to the admin. |
| `inlineEditing` | `false` | Turns on editing on the page in the **Hover** and **Always** modes, see [Editing on the page](#editing-on-the-page). |
| `onEdited` | none | Called after an edit made on the page in a tab of its own was saved, see [Where an edit is saved](#where-an-edit-is-saved). The latest function passed is the one called. |
| `richTextEditor` | none | `() => import('@focus-reactive/payload-plugin-visual-editing/rich-text')`. With it and `inlineEditing`, rich text is edited on the page. The latest function passed is the one called. |
| `buildImageUrl` | the URL of the media in the Payload API | `(media) => string \| undefined`. The address a replaced image is shown at on the page, for a site that serves its images through its own path or image optimizer, such as `` (media) => `/images/${media.filename}?width=1080` ``. `media` holds the `url`, `width` and `height` of the picked media, and its `id`, `filename` and `alt` when the admin or the API gave them. Without it, or when it returns `undefined`, the page shows the `url` of the media, resolved against the origin of `payloadApi`. The latest function passed is the one called. |
| `buildAdminEditUrl` | built in | Builds the link used when the page was not opened from the admin. A link without an origin opens on `adminOrigin`. |
| `payloadApi` | `<adminOrigin>/api` when `adminOrigin` is set | URL of the Payload REST API, such as `https://cms.example.com/api`. With `renderValue` on `LiveRichText`, unsaved rich text is checked through the `unsaved-rich-text` endpoint instead of the action. With `inlineEditing`, a page in a tab of its own saves edits there; without the option it uses `/api` of the page's own origin. |

## Reads with every locale

A draft read with `locale: 'all'` returns localized values keyed by locale (`title: { en, de }`). Each value is marked with the path of its field and its locale, so a click on the German title opens `title` in German when it opens a new admin tab. The `_meta` of a localized rich text, upload or relationship sits on the value of each locale: `withVisualEditingPath(page.content.en)`. Instant preview does not touch these values.

When the clicked document is already open in the admin, the bridge focuses the field in the locale the admin is showing. It does not switch the admin locale.

## Upgrading from 1.4.0

No config change is needed, and nothing changes for a site that does not turn the new options on.

- **Rich text edited on the page is opt-in twice**: `inlineEditing` on the plugin and the page, and `richTextEditor` on `VisualEditing.Provider` or `mountVisualEditing`. Only a site that passes `richTextEditor` imports `./rich-text` and needs the [Lexical packages](#the-lexical-packages).
- **Regenerate the import map** when `inlineEditing` is on: the admin gets a `RichTextEditReceiver`.
- **With both options on, a click into rich text edits it in place** instead of opening the field in the admin. The **Edit** badge still opens the field.

## Upgrading from 1.3.0

No config change is needed. What looks different:

- **A violet accent instead of green.** Frames, the badge and the toggle use `accentColor`, violet by default. Pass `accentColor` (and `accentTextColor` for a light one) to the provider or `mountVisualEditing` when the site itself is violet.
- **Frames instead of outlines.** The overlay no longer sets `outline` on the page's elements. It draws one rectangle per editable element in a layer above the page. A page style that relied on the overlay's inline `outline` has nothing to read any more; `[data-ve-target]` is still set on every edit target.
- **The toggle is a light card in the top right corner** instead of a dark bar in the bottom right, so a page that scrolls inside Live Preview cannot push it out of view. It can be dragged, and its modes run Off → Hover → Always. Its place is kept in `localStorage` under `visual-editing-toggle-position`.
- **The focused field in the admin** is shown by its own border, which turns blue and pulses, instead of an overlay drawn around the label and the field.

## Upgrading from 1.2.0

Regenerate the import map. The plugin adds `PreviewPageBridge` to every collection and global with Live Preview, and `OpenFormAnnouncer` to every collection and global it marks, both also with `instantPreview` off. Without `OpenFormAnnouncer` in the import map a link with `?veFocus` waits 15 seconds before it focuses the field.

- **A click on a page served from another origin than the admin opens the field.** The admin used to accept clicks only from its own origin. It now also accepts them from the Live Preview window, on the origin of its URL.
- **The page no longer posts a click to any origin.** Without `adminOrigin` it posts to its own origin, as instant preview already did.
- **Draft reads over REST and GraphQL can be marked.** Only with the `x-visual-editing` header and a signed-in user, see [Pages without React](#pages-without-react). Reads that do not send the header are unchanged.
- **With `instantPreview` on, the plugin adds two endpoints** under `/api/visual-editing/`, see [How the page is allowed to read the unsaved value](#how-the-page-is-allowed-to-read-the-unsaved-value). A grant issued before a deploy that changes how it is signed is refused once; the admin asks for a new one when the page asks again or within four minutes.
- **A draft page without the overlay loses its markers.** With the toggle on **Off** and instant preview off, or with `framedOnly` in a normal tab, the page used to keep every marker, and a script that splits text into characters rendered them as empty boxes. `VisualEditing.Overlay` and `mountVisualEditing` now remove them from the text, every attribute, the title and `<head>`, and put them back when they unmount. A script that reads marked text from the page after that sees clean text.
- **The meta tags of `<head>` lose their markers while the overlay runs**, like the title already did.
- **A structural rich text edit makes one render call, not one per structure.** `LiveRichText` and the rich text of `mountVisualEditing` wait 200 ms after a new structure before they start a call. Enter followed by typing used to start two calls in a row and showed the new text only after both.
- **A page without React renders a structural edit itself.** With `renderRichTextValue`, `mountVisualEditing` shows the new structure as the admin posts it and asks Payload 350 ms after the last one, see [Rendered on the page first](#rendered-on-the-page-first). Your `renderRichTextValue` now also runs on every structure, in the browser. A page that also passes `renderRichText` is checked through the `unsaved-rich-text` endpoint while it holds a grant, and through `renderRichText` otherwise. Print `richTextAttributes` again: its attribute now carries the `_meta` of the value and whether it holds references. Pass `optimistic: false` to keep the old behaviour.
- **An unsaved rich text read reads one field, not the whole document.** `readUnsavedRichText` and the `unsaved-rich-text` endpoint pass `select` with the top-level field that holds the rich text, so Payload no longer reads and populates every other field of the document for each structural edit. Collection and field `afterRead` hooks of your project see only that field during the read. A hook that needs another field (a slug, a sibling value) should pass `readWholeDocument: true` to `readUnsavedRichText` and set the plugin option `readWholeDocument: true` for the endpoint.
- **`LiveRichText` can render a structural edit on the page.** Pass your renderer as `renderValue` from a client module, and `payloadApi` to `VisualEditing.Provider` to check it through the endpoint instead of the action, see [Rendering on the page with `renderValue`](#rendering-on-the-page-with-rendervalue). Without `renderValue` nothing changes. `liveRichTextOf` now also returns the `_meta` of the value and whether it holds references; spread its whole result into `LiveRichText`.
- **An element whose whole text is one marked field gets that field's `data-ve-*` attributes while the overlay runs.** A heading that a script of your site splits into words after the overlay found it stays an edit target and keeps its instant text; the overlay then writes the new value as plain text into it, which resets the split until the page reloads. The attributes are removed when the overlay unmounts. A CSS selector of your site on `[data-ve-path]` now also matches these elements.
- **Markers are about half as long.** A marker used to spell out the names of its properties and state the path of a row twice, about 1.6 KB of UTF-8 for a field in a row; it now holds the same identity as a short list. Upgrade the server and the frontend together: the overlay of this version reads both forms, an overlay of 1.2.0 does not read the new one and leaves it in the text. Code of your own that decodes a marker with `vercelStegaDecode` gets the list; `stripMarkers` and `vercelStegaClean` work as before. A block name the page never shows still costs a marker in every block: add `blockName` to `excludeFieldNames` to leave it out.
- **The page half of instant preview is on by default.** `instantPreview` of `VisualEditing.Provider` and `mountVisualEditing` used to be `false`. The admin still sends nothing unless the plugin option is on, so a site without the plugin option sees one difference: with the toggle on **Off** the overlay runs instead of the marker cleaner, which costs a few milliseconds more on a page with some hundred marked texts. Pass `instantPreview={false}` to keep the old behaviour.
- **`payloadApi` is `<adminOrigin>/api` when `adminOrigin` is set.** A page that names its admin origin and prints `richTextAttributes` or passes `renderValue` now asks the `unsaved-rich-text` endpoint without being given `payloadApi`. Pass `payloadApi` when your API is elsewhere, or an empty string to keep the page from asking.
- **The mode toggle lives in a shadow root.** Its element is `[data-ve-toggle]` on `<body>`, and its buttons and styles are inside its shadow root, so styles of the site no longer reach them and the toggle no longer inherits fonts or resets. `[data-ve-toggle-root]`, `[data-ve-toggle-btn]` and the `<style id="ve-toggle-styles">` element are gone: a selector or a test of your own that used them finds nothing. Reach a button through `document.querySelector('[data-ve-toggle]').shadowRoot`; the buttons are `button[data-mode]` with `role="radio"`.
- **`isSlug` and `isHash` exclude less, so more values are marked.** `isSlug` now needs a letter: `8-10` and `10-20-30` are marked, `top-10` and `a-1` still are not. `isHash` now needs a value without white space: `#1 in the ranking` is marked, `#demo` and `#` still are not. A project that passes its own `excludeValues` with these two gets the new behaviour; write your own predicate to keep the old one.
- **All peers are optional, and `react` and `react-dom` accept `^18.2.0` again.** The Payload app still needs `payload`, `@payloadcms/ui` and React 19. A site that installs the package only for `./dom` gets none of them, and a site that keeps React 18 for something else can install it.

## Upgrading from 1.1.1

No config change is needed. Regenerate the import map when you turn `instantPreview` on: it adds `InstantPreviewBroadcaster` and `OpenFormAnnouncer`.

Peer dependencies: `react` is narrowed from `^18 || ^19` to `^19`, `react-dom ^19` is a new peer, and `next` is no longer a peer. A project on React 18 could not run the admin of Payload 3 anyway: `@payloadcms/ui` 3.79 requires React 19.

Globals:

- **A Local API draft read of a global is marked at every `depth`.** The plugin used to take the draft flag of a global read from `req.query`, so `payload.findGlobal({ slug, draft: true })` was marked only when a populated relationship happened to set the flag. It now takes it from the `draft` argument of the read, through a `beforeOperation` hook that replaces the `beforeRead` hook globals had.
- **A published read is never marked by another read.** Only the read's own request can mark it: `draft: true` through the Local API, or `context: { visualEditing: true }`, which marks any read. Whether a read is marked is decided for that operation alone: a read inside it (a population, a read in an access function or a hook, also of the same collection or global, also one that fails), a read beside it on the same `req`, or a `context` object shared between calls cannot mark it. Version reads of collections and globals are not marked unless they pass `context: { visualEditing: true }`. A Local API read of a global without `draft: true` is not marked even inside a request whose URL has `?draft=true`.
- **One case leaves a draft read unmarked:** a draft and a published read of the same global that run at the same time on one `req`. Both come back without markers. Read them one after the other, or on separate requests, to get the markers of the draft read.
- **Collections get two hooks less.** Markers and `_meta` of a collection read are written in one `afterOperation` hook; the plugin no longer adds `beforeOperation` and `afterRead` hooks to collections. A collection `afterRead` hook that a later plugin or config adds after this one no longer sees the `_meta` of a draft read.

Markers:

- **Populated documents carry one marker per text.** Text below the top level of a populated document (in groups, array rows and blocks), and all text of a document in a `hasMany` field, used to carry two markers in one string: its own, which the overlay read, followed by a second one with a path through the outer document (`related.list.0.label`). The second one is gone and those strings are shorter. Click-to-edit behaves as before.
- **Populated documents of skipped collections are not marked.** Some of their text used to be marked as a field of the outer document (`author.links.0.label` on the page), a path that does not exist there. The `_meta` on the populated document, which addresses the relationship field, is still there.
- **Any document nested in a skipped one loses its `_meta`.** For page → skipped author → page, upload or any other populated document, the nested document used to carry a `_meta` with a path of the outer page (`author.favourite`). It has none now, so `withVisualEditingPath` returns `{}` for it. Text of a marked collection is still marked as its own.
- **`hasMany` relationships and uploads.** Each populated document now has a `_meta` that addresses the field (`gallery`). There was none, so `withVisualEditingPath(page.gallery[0])` used to return `{}`.
- **Fields with several `relationTo`.** The `_meta` on the `value` of an upload had the path `image.value`, which the admin could not focus. It is `image` now. The `value` of a relationship had no `_meta` and has one now. Every entry of a `hasMany` field is a `{ relationTo, value }` object and carries the `_meta` of the field at every `depth`, also at `depth: 0`, where `value` is an id.
- **Fields the editor cannot reach.** Fields with `hidden: true` or `admin.disabled` are no longer marked; `admin.hidden` and `admin.readOnly` already were not. A string that its own group, row or block does not make editable (text in a hidden, read-only or excluded group or in a block the config does not know, the value of a `select`) used to get the marker of a text field with the same name further up (`internal.label` opened `label`). It has no marker now. A field named `apiKey` is no longer marked.
- **Blocks declared through `blockReferences`.** Their text had no marker, or the marker of a top-level field of the same name. It is now marked with its own path (`sections.0.quote`), at every level of nesting.
- **Version reads that pass `context: { visualEditing: true }`.** The version of a collection version read is now marked like a document read of its parent: text in rows and blocks gets markers, rich text, relationship and upload values get a `_meta`, and every marker states the id of the parent document. Before, only its top-level text was marked, without a document id on SQL adapters.
- **`blockName`.** Still marked, except for a block with `admin.disableBlockName`. A click now focuses the name input in the block header.
- **Reads with `locale: 'all'`.** A localized text at the top level had no marker and rows of a localized array lost their index (`list.label`). Localized values are now marked at every depth with the path of a single-locale read plus `locale`. The `_meta` of a localized rich text, upload or relationship moved from the object that holds the locales to the value of each locale and states `locale`; `withVisualEditingPath` writes it as `data-ve-locale`.
- **Otherwise unchanged while `instantPreview` is off.** With the option on:
  - Fields inside array rows and blocks also state a `key` (the path with row ids instead of indexes). For a rich text field in a row it is on the `_meta`, and `withVisualEditingPath` writes it as `data-ve-key`.
  - The text nodes of rich text carry markers, see [Markers in rich text](#markers-in-rich-text). Check code that reads rich text from draft reads and clean it with `stripMarkers`.
  - Upgrade the server and the frontend together: an overlay of 1.1.1 or earlier does not know these markers and leaves them in the text of the page, where they end up in copied text.

  - The plugin adds the key `"@focus-reactive/payload-plugin-visual-editing/schemaCache"` to `config.custom`, next to your own keys. `readUnsavedRichText` reads it from there, so it must survive a later plugin or config that replaces `custom`: spread the `custom` it gets. Without the key `readUnsavedRichText` reads nothing and logs one warning. With the option off, `config.custom` is left as it is.
  - Collections and globals get one more `beforeRead` hook. It does nothing unless `readUnsavedRichText` made the read. Structural edits of rich text reach the preview before the save only where you add [`LiveRichText`](#unsaved-rich-text-structure); every other page behaves as before.

Overlay:

- **Edit targets follow the page.** A target is bound again when React renders another field or document into the same element. An element that leaves the overlay, or a wrapper that loses its `data-ve-*` attributes, loses its frame and badge.
- **Click-to-edit after a row move** (with `instantPreview`): between a move in the form and the refresh, a click opens the row that was clicked, not the row that now has its index. A rich text wrapper does the same through its `data-ve-key`. For this the plugin adds an `OpenFormAnnouncer` to the document controls of every collection and global it marks, with or without Live Preview; it renders nothing and tells the bridge which row ids the open form has. It is now added with `instantPreview` off as well, because a link with `?veFocus` waits for it.

## Caveats

- **Click-to-edit works across origins only from the Live Preview.** The admin accepts a click from its own origin, and from the Live Preview iframe or the window it opens, on the origin of the Live Preview URL; pass `adminOrigin` to the page. A page on another origin that has no admin window behind it, such as one opened from a bookmark, opens the field in a new admin tab; a click posted from any other window on another origin is ignored.
- **`target="_blank"` must not carry `noopener`** when you open the frontend from the admin in a new tab. The overlay talks to `window.opener`. The Live Preview iframe is not affected.
- **`slug` is never marked.** Zero-width characters in a slug end up in URLs.
- **A value that starts to match `excludeValues`** (a heading that becomes `hello-world`) is rendered without a marker. The overlay stops patching that text node and does not write an earlier value back. Click-to-edit and instant preview return with the next marked render.
- **Do not transform marked text on the server and write it back**, see [Enrichment modes](#enrichment-modes).

## Contributing

See [`CLAUDE.md`](./CLAUDE.md) for where things are, the rules that are easy to break and how to test.

## License

MIT
