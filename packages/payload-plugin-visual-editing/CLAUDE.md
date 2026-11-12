# @focus-reactive/payload-plugin-visual-editing — Agent Guide

Payload v3 plugin: click-to-edit overlays on server-rendered draft content through Vercel stega markers and a `postMessage` bridge to the admin, plus an optional instant preview of text edits.

[`README.md`](./README.md) is the user document: when behaviour changes for a project that uses the plugin, update it, including "Upgrading". Read the rules below before changing anything.

## Where things are

| Part | Code |
|---|---|
| Public entries | `src/index.ts` (plugin, `readUnsavedRichText`, `stripMarkers`, `excludeValues`), `src/client/index.ts`, `src/admin/index.ts` |
| Server hooks and marking | `src/server/markRead.ts` (marks a read), `src/server/markedReads.ts` (decides whether a read is marked), `src/server/hooks/*` (Payload adapters), `src/server/richText/*` |
| Unsaved rich text on the server | `src/readUnsavedRichText.ts`, `src/server/unsavedRichText/*` |
| Shared by server, admin and page | `src/shared/*`: `protocol.ts` (messages, `data-ve-*` attributes), `shared.ts`, `veDocument.ts`, `fieldKey.ts`, `editableSchema/*`, `richText/*` |
| Admin bridge (click-to-edit) | `src/admin/VisualEditingBridgeProvider.tsx`, `src/admin/openField/*`, `resolveContainerChain.ts`, `expandAndFocus.ts` |
| Instant preview in the admin | `src/admin/instantPreview/previewSession.ts` (decides what the preview page is sent), `src/admin/InstantPreviewBroadcaster.tsx`, `src/admin/instantPreview/usePreviewPage.ts`, `src/admin/instantPreview/usePreviewWindow.ts` (React adapters) |
| Overlay on the page | `src/client/overlay/fieldTracker.ts` (one record per marked text node: markers stripped and restored, own writes counted, fields and rich text nodes reported and released), `src/client/overlay/editTargets.ts`, `src/client/createOverlay.ts`, `src/client/*` |
| Instant preview on the page | `src/client/instantPreview/liveFields.ts` (what each live field shows and announces), `src/client/instantPreview/instantPreview.ts` (routes tracker and admin events to it), `src/client/instantPreview/unsavedRender/unsavedRender.ts` (what a live rich text shows and which render call it starts), `LiveRichText.tsx` and `unsavedRender/useUnsavedRender.ts` (React adapters) |

`admin` and `client` never import `server`; `shared` imports none of them; `client/overlay` never imports `client/instantPreview`. Check with `bunx madge --circular --extensions ts,tsx src`. `shared`, `server`, `client/overlay` and `client/instantPreview` never import React or `@payloadcms/ui`, except the React adapters of the live rich text; the rule in the root `oxlint.config.ts` checks it on commit.

## Things that are easy to break

- **Group edit targets by document, path, locale and anchor.** Three cards that each render `title` must not become one target around all three.
- **A `_meta` is a field reference.** `markRead` writes it on rich text, relationship and upload values and on populated documents, and an outer read leaves a value that has one as it is. Holders never leave `markRead`.
- **A holder path never crosses a relationship.** Do not look up the related collection's schema from the outer document.
- **The editable schema can refer to itself.** A referenced block nested in itself gives a cyclic schema. Walk it along a path or along data; never recurse over it and never serialise it. Only `src/shared/editableSchema/` builds and walks it; callers use `editableSchema.ts` (`isMarkable`, `holderFieldAt`, `richTextValueAt`, `schemaPathOfRichText`) and never read the object.
- **Add a field type to `editableSchema.ts` only together with its marker on the server.** The admin sends what that rule allows.
- **Server and admin must agree on leaves and shape.** Both import `isTextLeaf` and `shapeOf`. A change to either changes every node key.
- **The editor state leaves the admin only in `src/admin/instantPreview/unsavedStructures.ts`**, for a field the page announced with `ve:rich-text-rendered`, when the shape changes. Never per keystroke, never in a snapshot or a patch.
- **`readUnsavedRichText` trusts nothing in the request.** The document is read with the user's access, the state is validated and placed only into a field the editable schema lists as `richText`, block fields come from the saved document, and the `_meta` of the result comes from the read. Do not render a posted state that did not go through it.
- **The field tracker releases a node before it reports it again.** `liveFields` keeps no node map: it releases a node by the address of the match it was given. A node reported with a new field before its old match was released would be patched as both fields.
- **Never two render calls out.** A Server Action occupies the router's queue until it returns; `unsavedRender.ts` starts the next call only when the previous one has settled, whatever the component shows meanwhile.
- **The fields of a block never leave the admin.** `unsavedStructures.ts` posts `withoutBlockFields(state)`.
- **`LiveRichText` never gets the value.** Its props are the field identity and a shape. Passing the value would serialise it into every draft page.
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

Public package, released by semantic-release through the monorepo flow. The peer range for `payload` and `@payloadcms/ui` is `^3.79.0`, because the bridge depends on `useConfig().getEntityConfig`; widen it only after testing against the lower bound. `react` and `react-dom` are `^19`, which `@payloadcms/ui` 3.79 requires; `next` is not a peer because nothing imports it. Do not bump `version` by hand.
