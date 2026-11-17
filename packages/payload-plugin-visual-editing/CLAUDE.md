# @focus-reactive/payload-plugin-visual-editing — Agent Guide

Payload v3 plugin: click-to-edit overlays on server-rendered draft content through Vercel stega markers and a `postMessage` bridge to the admin, plus an optional instant preview of text edits.

[`README.md`](./README.md) is the user document: when behaviour changes for a project that uses the plugin, update it, including "Upgrading". Read the rules below before changing anything.

## Where things are

| Part | Code |
|---|---|
| Public entries | `src/index.ts` (plugin, `readUnsavedRichText`, `stripMarkers`, `excludeValues`), `src/client/index.ts` (React), `src/dom/index.ts` (no React), `src/admin/index.ts` |
| Endpoints and preview grants | `src/server/endpoints.ts` (`preview-grant`, `unsaved-rich-text`, added with `instantPreview`), `src/server/previewGrant.ts` (signs and checks a grant), `src/admin/instantPreview/previewGrants.ts` (asks for one and keeps it fresh) |
| Server hooks and marking | `src/server/markRead.ts` (marks a read), `src/server/markedReads.ts` (decides whether a read is marked), `src/server/hooks/*` (Payload adapters); the rich text markers are `src/shared/richText/markTextLeaves.ts`, shared with the page |
| Unsaved rich text on the server | `src/readUnsavedRichText.ts`, `src/server/unsavedRichText/*` |
| Shared by server, admin and page | `src/shared/*`: `protocol.ts` (messages, `data-ve-*` attributes), `shared.ts`, `veDocument.ts`, `fieldKey.ts`, `editableSchema/*`, `richText/*` |
| Admin bridge (click-to-edit) | `src/admin/VisualEditingBridgeProvider.tsx`, `src/admin/previewPages.ts` (which windows it accepts clicks from), `src/admin/PreviewPageBridge.tsx` (announces the Live Preview window, posts `ve:document-saved`), `src/admin/openField/*`, `resolveContainerChain.ts`, `expandAndFocus.ts` |
| Instant preview in the admin | `src/admin/instantPreview/previewSession.ts` (decides what the preview page is sent), `src/admin/InstantPreviewBroadcaster.tsx`, `src/admin/instantPreview/usePreviewPage.ts`, `src/admin/instantPreview/usePreviewWindow.ts` (React adapters) |
| Page session and adapters | `src/client/session.ts` (mode, storage, frame, admin origin), `src/client/overlayScope.ts` (locale and saved shapes of one overlay), `src/client/toggle.ts`, `src/client/saveEvents.ts`, `src/client/previewGrant.ts`; React adapters `src/client/*.tsx`, DOM adapter `src/dom/*` |
| Overlay on the page | `src/client/overlay/fieldTracker.ts` (one record per marked text node: markers stripped and restored, own writes counted, fields and rich text nodes reported and released, an attribute the page renders again cleaned again, an element whose whole text is one field stamped with its `data-ve-*` attributes so a split of its text keeps the target and the instant text, written into in place of its text-bearing children only, so an icon stays), `src/client/overlay/editTargets.ts`, `src/client/overlay/markerCleaner.ts` (markers of `<head>` while the overlay runs, and of the whole page of a draft without an overlay), `src/client/createOverlay.ts`, `src/client/*` |
| Instant preview on the page | `src/client/instantPreview/liveFields.ts` (what each live field shows and announces), `src/client/instantPreview/instantPreview.ts` (routes tracker and admin events to it), `src/client/instantPreview/unsavedRender/liveRichText.ts` (one live rich text: admin channel, announce, saved shape, held saved render), `unsavedRender.ts` behind it (what it shows on the page and which render call it starts), `optimisticValue.ts` (the value the page builds from a posted state and a base), `LiveRichText.tsx` and `unsavedRender/useUnsavedRender.ts` (React adapters), `src/dom/liveRichTextElements.ts` (DOM adapter); `unsavedRender/valueSource.ts` (asks the `unsaved-rich-text` endpoint with the grant), `unsavedRender/baseValues.ts` (the saved value and the answers each field renders on the page with) and `unsavedRender/renderValue.ts` (a renderer of the value on the page and through Payload, and the grants, source and bases `VisualEditing.Provider` holds for `payloadApi`) serve both adapters |

`admin` and `client` never import `server`; `shared` imports none of them; `client/overlay` never imports `client/instantPreview`. Check with `bunx madge --circular --extensions ts,tsx src`. `shared`, `server`, `client/overlay`, `client/instantPreview`, the React-free modules of `client` and `dom` never import React or `@payloadcms/ui`, except the React adapters of the live rich text; the rule in the root `oxlint.config.ts` checks it on commit. Add a new React-free module of `client` to that rule.

## Things that are easy to break

- **Group edit targets by document, path, locale and anchor.** Three cards that each render `title` must not become one target around all three.
- **A `_meta` is a field reference.** `markRead` writes it on rich text, relationship and upload values and on populated documents, and an outer read leaves a value that has one as it is. Holders never leave `markRead`.
- **A holder path never crosses a relationship.** Do not look up the related collection's schema from the outer document.
- **The editable schema can refer to itself.** A referenced block nested in itself gives a cyclic schema. Walk it along a path or along data; never recurse over it and never serialise it. Only `src/shared/editableSchema/` builds and walks it; callers use `editableSchema.ts` (`isMarkable`, `holderFieldAt`, `richTextValueAt`, `schemaPathOfRichText`) and never read the object.
- **Add a field type to `editableSchema.ts` only together with its marker on the server.** The admin sends what that rule allows.
- **Server and admin must agree on leaves and shape.** Both import `isTextLeaf` and `shapeOf`. A change to either changes every node key.
- **The editor state leaves the admin only in `src/admin/instantPreview/unsavedStructures.ts`**, for a field the page announced with `ve:rich-text-rendered`, when the shape changes. Never per keystroke, never in a snapshot or a patch.
- **`readUnsavedRichText` trusts nothing in the request.** The document is read with the user's access, the state is validated and placed only into a field the editable schema lists as `richText`, block fields come from the saved document, and the `_meta` of the result comes from the read. The server never renders a posted state that did not go through it. The page may render in the browser the state the admin posted to it, with data the server already gave this page, and nothing else. A request without a state reads the saved value of the field under the same checks and a read key of that field alone, so no newer state and no read of another row of the same list replaces it; the page asks for the bases of several rows at once. Both read only the top-level field that holds the rich text unless `readWholeDocument` is set.
- **The field tracker releases a node before it reports it again.** `liveFields` keeps no node map: it releases a node by the address of the match it was given. A node reported with a new field before its old match was released would be patched as both fields.
- **A value is marked only when `hasMarker` says so, and the overlay never writes a value that stays the same.** `hasMarker` (`src/shared/stegaText.ts`) is the pattern of `@vercel/stega`. A range of zero-width code points also matches an em dash, curly quotes, an ellipsis and a narrow no-break space: the tracker wrote such an `aria-label` back unchanged, the observer reported the write and the page froze in that loop. The mutation pipeline skips an attribute record whose value equals its old value, so a write that changes nothing is never reported.
- **An adapter of a live rich text shows what `shownFor` returns and calls its `commit` once that is on screen, after every render.** The module waits for that commit before it starts the next render call; nothing else of its timing belongs in an adapter. The React adapter sets a render on the page with a plain `setState` and an answer of a call in `startTransition`, so the render on the page is never held behind a pending transition.
- **With `renderValue` and a grant from `payloadApi`, `LiveRichText` checks through the endpoint, not the action.** The answer goes through the same `renderValue`, so React updates the elements in place; without a grant it calls the action. Without `payloadApi` there is no base: a field with references waits for the action. Without `renderValue` nothing renders on the page.
- **A grant is the only way a request without a session reads unsaved rich text.** `unsaved-rich-text` checks its signature and expiry, loads the user it names and reads only the document it names, with that user's access. It populates a relationship, upload or link node only when the saved value of the same field refers to the same document, and never a document of an auth or `payload-*` collection: `savedReferences.ts` holds every other id back in the `beforeRead` hook and `readAsUser` puts it back after the read, and a read that asked for the rule and did not get it answers nothing. `readUnsavedRichText` itself, which the site's own server code calls, populates what the posted state names. The admin posts a grant only to the origin of the Live Preview URL, once per page load and grant (`previewGrants.ts` remembers what it sent); a page that starts to listen asks for it with `ve:preview-grant-request`, because its announcements do not say whether it holds one.
- **The admin accepts a click from another origin only from the Live Preview window, on the origin of its URL** (`previewPages.ts`). The page never posts to `"*"`.
- **Never two render calls out.** A Server Action occupies the router's queue until it returns; `unsavedRender.ts` starts the next call only when the previous one has settled, whatever the component shows meanwhile. A render on the page is not a call.
- **A structure is shown by the render on the page first, and the server is called once per pause.** `unsavedRender.ts` calls `optimistic` synchronously in `tell` and shows what it returns before any call; the call waits `SERVER_CHECK_PAUSE_MS` after the last structure and replaces the render on the page only with an answer for the structure the editor holds. An answer of nothing keeps the render on the page. A field the page cannot render (no renderer, no base, a renderer that throws) keeps the `STRUCTURE_SETTLE_MS` path, so it gets no slower.
- **Only a structure with references needs a base.** `baseValues.ts` asks for the saved value of one field: when the editor types in a field that had references when the page loaded, or when a structure with references of such a field, or of any field after a save, needs it. A structure without references renders with no base, before and after a save, and asks nothing until the pause. Never ask for every field of the page at once. A base that did not arrive is asked for again; when one arrives, its watchers render the structure the editor holds on the page again.
- **A save makes the structure the editor holds the saved one, until the page renders again.** `ve:document-saved` names the document Payload reported as saved and the locale of the admin (`PreviewPageBridge.tsx`); a save of another document, such as one in a drawer, or in another locale changes nothing for the field, and a message without a document (an admin of 1.2.0) counts as a save of the field. On a save of its document, `liveRichText.ts` takes the render it showed for that structure (or the first one that arrives for it) as the saved render, so `shownFor`, the saved shape `unsavedRender.ts` and the overlay scope are told and the saved shapes the overlay keeps follow it. A saved render the adapter passes that differs from the one it passed before replaces it. Adapters keep passing the render the page loaded with; they never track saves themselves.
- **A base is forgotten on every save.** `baseValues.ts` drops the saved value and the answers of every field on `ve:document-saved` and ignores what arrives for a call that started before it. A stale base shows the old fields of a block until the server answers.
- **`liveRichTextOf` and `richTextAttributes` carry `hasReferences` and `meta`** for the render on the page; an identity without them (markup of an older version) keeps the server path.
- **The value built on the page equals the answer of `readUnsavedRichText`, markers, `_meta` and populated documents included.** `optimisticValue.ts` places, populates and marks the state with the functions the server uses from `src/shared/richText/`; change them on one side only and the node keys drift. `tests/realPayload/realPayloadOptimisticParity.int.spec.ts` judges it on a real Payload.
- **The fields of a block never leave the admin.** `unsavedStructures.ts` posts `withoutBlockFields(state)`.
- **`LiveRichText` never gets the value.** Its props are the field identity and a shape. Passing the value would serialise it into every draft page.
- **Every character of a marker's payload costs twelve bytes in the page.** `toStegaPayload` (`src/shared/shared.ts`) writes a field as a list without property names and the row ids of its key once, `toRichTextNodeMarker` writes a text node as `shape#address`. Only `fromStegaPayload` and `fromRichTextNodeMarker` read a payload; both still read the objects 1.2.0 wrote.
- **`#` separates the parts of a node key.** A rich text field whose key contains it is not marked and not answered.
- **The overlay hook keeps its effect dependencies minimal** (`useVisualEditingOverlay.ts`). Creating the overlay again on every render would drop the MutationObserver and the values the live fields hold.
- **Never decide whether a read is marked from state another read can touch.** A collection decides from the `args` its `afterOperation` receives. A global counts open reads per `req` object and marks only while no other read of it is open; it fails closed. A flag in `req.context` is shared with nested reads, with failed reads that never clear it, with concurrent reads and, through Payload's `createLocalReq`, with the `context` object of the caller, and each of these marked a published read. The rule lives in `markedReads.ts`; the hooks only report operations to it. It counts `operation === 'read'`, Payload's name for `findGlobal`, as a draft read, not a typo for `find`.

## Commands

```bash
bunx vitest run            # all tests
bun run check-types        # tsgo
bunx ultracite fix <file>  # format and lint one file
bun run build              # swc + declarations into dist/
```

## Testing

- Specs mirror the source tree: `tests/server`, `tests/overlay`, `tests/admin`, `tests/instantPreview`, `tests/realPayload`, helpers in `tests/support`.
- Server behaviour is judged by the specs in `tests/realPayload/`, which read through a real Payload on in-memory sqlite and run in `node`, like `tests/server/latestReads.int.spec.ts` and `tests/server/unsavedRichTextWithoutSchemaCache.int.spec.ts`. `tests/realPayload/realPayloadRichTextLive.int.spec.ts` runs a real Payload under jsdom. A unit test that feeds `markRead` a hand-written document must use the shape those reads produce.
- Overlay tests post `MessageEvent`s on `window` and stub `window.parent` to stand in for the admin. Model both list shapes: the same Text node rendered again with another path (list keyed by row id) and with another key (list keyed by index).
- Add a failing test that reproduces the observed DOM or data before touching the overlay or the encoder.

## Dev loop against an external consumer

A consumer that pins this package as a `file:` dependency copies `dist/` at install time. After a change:

```bash
bun run build
rsync -a --delete \
  packages/payload-plugin-visual-editing/dist/ \
  ../../<consumer>/node_modules/@focus-reactive/payload-plugin-visual-editing/dist/
```

Hard-refresh the preview tab or restart `next dev` if the client bundle does not change. In the preview, `document.querySelectorAll('[data-ve-target]')` lists every edit target; the attribute holds the marker path.

## Publishing

Public package, released by semantic-release through the monorepo flow. The peer range for `payload` and `@payloadcms/ui` is `^3.79.0`, because the bridge depends on `useConfig().getEntityConfig`; widen it only after testing against the lower bound. All peers are optional, because a site that uses only `./dom` needs none of them. `react` and `react-dom` are `^18.2.0 || ^19.0.0`: the page adapters use nothing newer than `useSyncExternalStore`, and the admin gets React 19 from Payload. `next` is not a peer because nothing imports it. Do not bump `version` by hand.
