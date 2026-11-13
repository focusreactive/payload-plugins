# @focus-reactive/payload-plugin-visual-editing

Click-to-edit for Payload CMS. On draft reads the plugin writes an invisible marker into every text value. The frontend overlay finds those markers in the rendered page, outlines the elements and adds an **Edit** badge. A click focuses the field in the Payload admin. With the optional instant preview, text typed in the admin form appears in the Live Preview before it is saved.

## Installation

```bash
bun add @focus-reactive/payload-plugin-visual-editing
```

Peer dependencies: `payload ^3.79`, `@payloadcms/ui ^3.79`, `react ^19` and `react-dom ^19`, the React that Payload 3 needs. The plugin does not import `next`; the setup below uses Next.js because the Payload admin runs on it. It is built and tested against Payload `3.90.1`.

## Setup

The plugin has a server half (Payload hooks that mark draft reads and strip markers from writes, plus an admin component) and a client half (the overlay on your frontend). Markers are written only into **draft** reads made with the **Local API** outside the admin, so the steps below wire Next.js draft mode end to end. `apps/cms` in this repository uses the plugin with `enrichment: 'explicit'`, instant preview and `LiveRichText`, and is the working reference.

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

- `VisualEditing.Toggle` is the floating Off / Hover / Always control. The chosen mode is kept in `localStorage`.
- `VisualEditing.Overlay` scans its children for markers. Content outside it is not touched.

### 7. Mark rich text, uploads and relationships

Text fields work on their own. Rich text, uploads and related documents need one spread in your renderer, see [Rich text, uploads and relationships](#rich-text-uploads-and-relationships).

### 8. Regenerate the admin import map

```bash
bunx payload generate:importmap
```

### Using it

Open a document in the admin, open **Live Preview** and set the toggle to **Always** or **Hover**. Editable text gets an outline and an **Edit** badge. A click on the badge or anywhere on the outlined element focuses the field in the admin form. A click with a modifier key and a text selection keep the page's own behaviour; a double click does nothing. A click on text of another document opens that document in a new admin tab.

To leave draft mode in a normal browser tab, open `/next/exit-preview`.

## What gets a marker

- Fields of type `text`, `textarea` and `email`, at any depth: in groups, tabs, rows, collapsibles, array rows and blocks (declared inline or through `blockReferences`).
- The name of a block (`blockName`), unless the block sets `admin.disableBlockName`. A click on a rendered block name focuses the name input in the block header.
- Not: empty values, and values that match `excludeValues` (by default URLs, slugs like `hello-world`, `#fragments` and ISO dates).
- Not: fields named `slug`, `folder`, `_status`, `apiKey` or anything in `excludeFieldNames`.
- Not: fields the editor cannot change in the admin, that is `hidden: true`, `admin.hidden`, `admin.readOnly` or `admin.disabled`, and everything inside a group, array or blocks field that has one of them.
- Not: `text` fields with `hasMany`, numbers, selects, dates and other non-text fields.
- With `instantPreview` only: every text node of a Lexical rich text field, see [Markers in rich text](#markers-in-rich-text).

A populated document (a relationship or an upload read with `depth ≥ 1`) is marked as itself: its text carries its own collection, id and paths, wherever it appears. A populated document of a collection listed in `skipCollections` gets no markers.

If you render a marked value into an attribute, the overlay removes the marker from `alt`, `title`, `aria-label` and `placeholder`. In any other attribute (an anchor `id`, a `data-*` attribute) it stays, so exclude such a field with `excludeFieldNames`.

## Rich text, uploads and relationships

The text of a rich text field belongs to its renderer, and an image has no text node to carry a marker. For these values the plugin leaves a `_meta` object on the value that says which field of which document holds it. Spread `withVisualEditingPath(value)` on the element that should become the edit target:

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

Turn it on in both halves and regenerate the import map:

```ts
// payload.config.ts
visualEditingPlugin({ instantPreview: true })
```

```tsx
// app/(frontend)/layout.tsx
<VisualEditing.Provider available={isEnabled} instantPreview adminBasePath="/admin">
```

### Requirements

- Live Preview is configured for the collection or global: `admin.livePreview` on it, or its slug in the root `admin.livePreview.collections` / `globals`.
- The frontend refreshes itself after a save, for example with `RefreshRouteOnSave` from `@payloadcms/live-preview-react`, see below.
- The admin posts to the origin of the Live Preview URL. The preview posts to `adminOrigin` on `VisualEditing.Provider`, its own origin by default.
- On a localized site, pass the locale of the page: `<VisualEditing.Overlay locale={locale}>`. The admin tags its messages with the locale it is editing, and the overlay can only ignore another locale when it knows its own.
- The admin bundle and the frontend overlay come from the same version of the plugin. An overlay of 1.1.1 or earlier leaves the markers of rich text in the page.
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
- In every toggle position, also **Off**. The toggle controls outlines, badges and click-to-edit only.

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

The editor state of a rich text field holds its text, the ids of uploads, relationships and linked documents, and the fields of link and upload nodes. The admin posts it when the structure of the field changes, and only for a field the page announced as rendered in `LiveRichText`. That announcement also comes from the page, so the boundary is again rule 3 for the rich text field itself. Blocks in the state are posted with their id and type and without the values of their fields. The page hands the state to your Server Action, which answers only to a signed-in user who may read the document.

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

- `liveRichTextOf(content)` returns the identity of the field and the structure of the saved value, about 150 bytes, or `null` for a value that is not a marked rich text: every published read, a read with `locale: 'all'`, a row without an `id`. A published page therefore gets no client component and no extra payload, and the value itself is never passed to the client.
- The action must render through the component the page uses, with the same wrapper element. React then swaps the two renders in place, and the text typed after the structural edit keeps updating through the markers.
- Props the renderer needs (a variant, a class name) can be bound: `action={renderUnsavedRichText.bind(null, { variant })}`. They arrive as the first argument of the action.
- `LiveRichText` renders no element of its own. Outside draft mode or with `instantPreview` off it only renders its children.
- Put it inside `VisualEditing.Overlay`. The overlay passes its `locale` on, and `LiveRichText` ignores the admin while it edits another locale.

`LiveRichText` makes one call at a time and only the latest state waits. When a call fails, takes longer than ten seconds or returns `null`, and when the returned elements throw while rendering, the preview shows the saved render, as it does without `LiveRichText`, and asks again a few times per structure, for about half a minute. A call that hangs is never joined by a second one.

**A Server Action shares a queue with `router.refresh()`.** While a render call is out, the refresh that brings the saved render waits for it. `readUnsavedRichText` answers `null` after `timeLimitMs` (three seconds by default), which bounds that wait per call within one server process. A slow server delays the saved render by up to one call; it never shows a wrong frame.

**Another transport.** Pass `render` in place of `action` to make the call yourself: `render(request, signal)` returns a promise of React nodes and gets an `AbortSignal` that `LiveRichText` aborts when it stops waiting. A route handler can answer a `fetch` with that signal with `readUnsavedRichText({ payload, request })` as JSON; that call stays off the router's queue and can be cancelled, but the page then renders the marked editor state in the browser, so your renderer and everything it renders for uploads, links and blocks must work as Client Components.

`readUnsavedRichText` is the only safe way to turn the posted state into something to render. Hand it the argument of the action untouched. It guarantees:

- **Nothing from the request is trusted.** It accepts a document of the config, a key that names a rich text field the plugin marks, a locale of the project and a Lexical editor state of at most `maxStateLength` characters of JSON (`DEFAULT_MAX_UNSAVED_STATE_LENGTH`, one million). The fields of blocks, uploads and links come from the saved document by node id, and related documents are reduced to their ids.
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

During that read your own hooks and access functions see the unsaved state as if it were stored: collection and field `afterRead` hooks, anything that caches by document id inside the read. `isUnsavedRichTextRead(req)`, exported from the main entry, tells such code that the read is one of these.

What this costs: one Server Action call per structural edit, never one per keystroke. Each call posts the editor state of that field and reads the document once. The draft mode check stays in your action because it is specific to Next.js; `readUnsavedRichText` does not depend on Next.

### Markers in rich text

With `instantPreview` on, a draft read puts a marker of roughly 130 to 150 zero-width characters into every non-empty text node of every Lexical rich text field the editor can change. `excludeValues` does not apply to them. Reads with `locale: 'all'` and rich text in a row without an `id` get none.

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
  - The reference setup needs the App Router and a Server Action. The Pages Router and frontends that are not Next.js can use `render` with their own transport, or keep the behaviour above.
  - While a Server Action call is out, `router.refresh()` waits for it, see [Unsaved rich text structure](#unsaved-rich-text-structure).
  - The call is made with the cookies of the preview page. A preview on another origin than the admin has no Payload session there; the answer is `null` and the structure appears with the save.
  - A structural edit is on screen one round trip after the admin sees it. Until then, and after a failed call, the preview shows the saved render. Text typed meanwhile is painted into the new render when it arrives.
  - The fields of a block inside rich text are never posted: the admin has no schema of the blocks of an editor, so it cannot tell which of their fields may leave the form. A block that is already saved is rendered with its saved fields, a new block with none, and an edit of a block's fields shows with the save.
  - The unsaved state is rendered as the editor holds it. Hooks that change a value on save (`beforeValidate`, `beforeChange`) have not run yet; their effect shows with the save. Hooks that run on read see the unsaved state, see `isUnsavedRichTextRead` above.
  - An editor state longer than `maxStateLength` is not rendered before the save.
  - A field the page renders twice makes two calls per structural edit, one per place.
- After the admin switches to another locale, instant preview resumes when the preview has loaded a page again. Payload reloads the Live Preview for the new locale; a popup preview window that was opened before the switch is sent nothing.
- After a client-side navigation inside the preview, fields of pages visited earlier stay on the admin's list until the preview does a full page load.
- In the popup preview window the admin cannot see a navigation. It keeps sending the listed fields to the popup until a page there reports its fields again or the popup is closed.
- The popup keeps unsaved text on screen after you leave the document without saving. It shows the saved content again when it reloads.
- While the preview shows fields of the open document, every change in the form reads the whole form state before the admin paints. On a form with several thousand fields this costs a few milliseconds per keystroke. With Live Preview closed it costs nothing.

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

In both modes `context.visualEditing` wins when it is set: `true` marks the read, `false` leaves it clean.

A `beforeChange` hook removes intact markers from every write. It cannot recognise a marker that a transformation damaged. If server code reads drafts, changes the text (a translation, a truncation) and writes it back, use `'explicit'` or pass `context: { visualEditing: false }` on those reads.

## Options

| Option | Type | Default | Purpose |
|---|---|---|---|
| `skipCollections` | `string[]` | `[]` | Collections the plugin does not mark. Payload's internal collections are always skipped. |
| `skipGlobals` | `string[]` | `[]` | Globals the plugin does not mark. |
| `excludeFieldNames` | `string[]` | `[]` | Field names that are never marked and never sent to the preview, in addition to `_status`, `folder`, `slug` and `apiKey`. |
| `excludeValues` | `((value: string) => boolean)[]` | `defaultExcludeValues` | Values that are not marked. Replaces the defaults (`isUrl`, `isSlug`, `isHash`, `isIsoDate`, all exported). |
| `adminBasePath` | `string` | `/admin` | Admin base path. Reads from below it are not marked; the bridge uses it to recognise the open document. |
| `enrichment` | `'auto' \| 'explicit'` | `'auto'` | See [Enrichment modes](#enrichment-modes). |
| `instantPreview` | `boolean` | `false` | See [Instant preview](#instant-preview). |

`LiveRichText` props:

| Prop | Purpose |
|---|---|
| `field`, `shape` | From `liveRichTextOf(value)`: spread its result. |
| `action` | A Server Action that renders the unsaved state. It is called with the request only. |
| `render` | In place of `action`: `(request, signal) => Promise<ReactNode>`, a call you make yourself. |
| `children` | The saved render. |

`VisualEditing.Provider` props:

| Prop | Default | Purpose |
|---|---|---|
| `available` | `false` | Turns the overlay on. Pass the draft mode flag. |
| `framedOnly` | `false` | Only run inside an iframe, that is the Live Preview. |
| `adminBasePath` | `/admin` | Must match the plugin option. |
| `adminOrigin` | the page's origin | Origin of the admin window. |
| `instantPreview` | `false` | See [Instant preview](#instant-preview). |
| `buildAdminEditUrl` | built in | Builds the link used when the page was not opened from the admin. |

## Reads with every locale

A draft read with `locale: 'all'` returns localized values keyed by locale (`title: { en, de }`). Each value is marked with the path of its field and its locale, so a click on the German title opens `title` in German when it opens a new admin tab. The `_meta` of a localized rich text, upload or relationship sits on the value of each locale: `withVisualEditingPath(page.content.en)`. Instant preview does not touch these values.

When the clicked document is already open in the admin, the bridge focuses the field in the locale the admin is showing. It does not switch the admin locale.

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

- **Edit targets follow the page.** A target is bound again when React renders another field or document into the same element. An element that leaves the overlay, or a wrapper that loses its `data-ve-*` attributes, loses its outline and badge.
- **Click-to-edit after a row move** (with `instantPreview`): between a move in the form and the refresh, a click opens the row that was clicked, not the row that now has its index. A rich text wrapper does the same through its `data-ve-key`. For this the plugin adds an `OpenFormAnnouncer` to the document controls of every collection and global it marks, with or without Live Preview; it renders nothing and tells the bridge which row ids the open form has.

## Caveats

- **Click-to-edit needs the frontend and the admin on the same origin.** The admin bridge accepts `ve:open-field` only from its own origin.
- **`target="_blank"` must not carry `noopener`** when you open the frontend from the admin in a new tab. The overlay talks to `window.opener`. The Live Preview iframe is not affected.
- **`slug` is never marked.** Zero-width characters in a slug end up in URLs.
- **A value that starts to match `excludeValues`** (a heading that becomes `hello-world`) is rendered without a marker. The overlay stops patching that text node and does not write an earlier value back. Click-to-edit and instant preview return with the next marked render.
- **Do not transform marked text on the server and write it back**, see [Enrichment modes](#enrichment-modes).

## Contributing

See [`CLAUDE.md`](./CLAUDE.md) for where things are, the rules that are easy to break and how to test.

## License

MIT
