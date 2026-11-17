# @focus-reactive/payload-plugin-stacked-editing

Sanity/Storyblok-style navigation for nested content in the Payload admin. Clicking an array or
blocks row opens it in a **panel layered on top of the previous one**, with **breadcrumbs** at the
top to jump between levels. Page-builder blocks, arrays, blocks inside arrays and blocks inside
blocks all work the same way, at any depth.

> **Status: not published yet.** The package is marked `"private": true`, so the release workflow
> (`multi-semantic-release --ignore-private-packages`) skips it. A publishable package without npm
> Trusted Publishing fails the release job. To publish, follow
> `.agents/skills/payload-plugins-add-package`: set `"private": false`, publish `1.0.0` manually,
> add the trusted publisher on npm, and create the git tag.

```
Deep nest sample  /  Layout  /  Deep Nest 01  /  Items  /  Item one label  /  Callouts  /  Callout 01
```

## Why

Payload shows nested rows as inline collapsibles. Three levels down, an editor is scrolling through
a long accordion and has lost track of where they are. This plugin keeps Payload's own fields,
validation, permissions, drawers and styling. It changes only one thing: where a row's fields are
shown.

## Install

```ts
// payload.config.ts
import { stackedEditingPlugin } from "@focus-reactive/payload-plugin-stacked-editing";

export default buildConfig({
  plugins: [
    stackedEditingPlugin(), // every collection and global
    // or: stackedEditingPlugin({ collections: ["pages"], globals: [] })
  ],
});
```

Then regenerate the import map: `payload generate:importmap`.

### Options

| Option        | Type       | Default          | Description                                         |
| ------------- | ---------- | ---------------- | --------------------------------------------------- |
| `collections` | `string[]` | all collections  | Collection slugs that get stacked editing.          |
| `globals`     | `string[]` | all globals      | Global slugs that get stacked editing.              |
| `enabled`     | `boolean`  | `true`           | `false` leaves the config untouched (inline rows).  |
| `defaultMode` | `"panel" \| "inline"` | `"panel"` | How rows behave (see below).               |
| `cards`       | `boolean`  | `true`           | Row preview cards in row headers (see [Row preview cards](#row-preview-cards)). |

**`defaultMode: "panel"`** (default): every array/blocks row, in the document and in each panel,
starts as a **collapsed card**, rows added later included. A click on the card's header opens it in
a panel. The **chevron** on the right still expands it inline, as in plain Payload. Collapsing is
done in form state only: it writes no preferences, changes no data and does not mark the document
modified. Rows the editor expands themselves (chevron, "Show All") stay expanded. Rows that Payload
expands again after a save are collapsed back into cards.

**`defaultMode: "inline"`**: rows behave as in plain Payload: they keep their saved expanded or
collapsed state and a header click toggles inline. A row opens in a panel only through the "open
in panel" icon in its header, shown faintly next to the `…` menu.

## Using it

- **Click a row card's header** (blocks or array) to open the row in a panel. A click on a row
  inside a panel stacks another panel on top. Hovering a header shows the "open in panel" icon.
- **Click the chevron** to expand or collapse the row inline instead (Alt/Option-click anywhere on
  the header does the same).
- **Breadcrumbs** read `Document / Field / Row / Field / Row …`. A row crumb goes back to that
  row's panel. A field crumb goes back to the panel that contains the field. The document crumb
  closes every panel. The trail always stays on one line. When it is too wide for the panel, the
  middle folds into a `…` button: `Document / … / parent / current`, or `Document / … / current`
  in a very narrow panel. If even that does not fit, the current crumb is cut with an ellipsis and
  shows its full text on hover. Hovering the `…` button (or clicking it, or pressing Enter on it)
  opens a menu of the hidden levels, indented by depth and labelled with their type (Blocks,
  Array, or the block or item label). Escape closes the menu without closing the panel. The fold
  follows the measured width of the real labels, not a fixed number of levels.
- **Escape**, the close button or the strip to the left closes the top panel.
- Row actions (the `…` menu, drag handle, block name input) work as before.
- Panel titles, breadcrumbs and the `…` menu use the title of the row's preview card (see below),
  next to Payload's own row label, for example `Hero 01`.

## Row preview cards

Rows show as Sanity-style cards instead of `Item 01` / `Untitled`: a 34px thumbnail, a title and a
muted subtitle, all updated live from the form. The plugin sets its `CardLabel` as the
`admin.components.RowLabel` of every managed array field and the `admin.components.Label` of every
managed block (including config-level `blocks` used through `blockReferences`). It never replaces
a label you set yourself. Turn the cards off with `stackedEditingPlugin({ cards: false })`.

Configure a card on the block, or on the array field, with `admin.custom.preview`. This is plain
data, so it reaches the admin through the client config:

```ts
import { definePreview } from '@focus-reactive/payload-plugin-stacked-editing'

const Features: Block = {
  slug: 'features',
  fields: [
    {
      name: 'items',
      type: 'array',
      admin: {
        custom: {
          preview: definePreview({ title: 'title', subtitle: 'points.length', media: 'image' }),
        },
      },
      fields: [/* title, image, points … */],
    },
  ],
}

const Hero: Block = {
  slug: 'hero',
  admin: { custom: { preview: definePreview({ subtitle: 'description' }) } },
  fields: [/* … */],
}
```

`select` paths are relative to the row. Dot paths reach into groups (`cta.label`). A path ending in
`.length` counts the rows of an array or blocks field and uses its labels (`2 Points`). Select
fields show their option label, dates are formatted, and rich text shows its first paragraph.

Without a config, or when a selected value is empty:

| Part | Default |
| --- | --- |
| title | the block's `blockName` if the editor set one; else the first `text`, `textarea`, `email`, `select` or `radio` field with a value at the row's own level (rows, collapsibles, unnamed groups and unnamed tabs are seen through); else the first paragraph of a rich text field; else Payload's label (`Hero 01`) |
| subtitle | the block label or the array's item label |
| media | the first `upload` field into an upload collection; else the block's `imageURL`; else a neutral icon |

Uploads given as an id are resolved once per page through the REST API
(`/api/<collection>/<id>?depth=0`). The card shows `sizes.thumbnail` when the collection has that
size, and the file itself otherwise. Files that are not images get the icon.

A custom label can show the same card: render `CardLabel` from
`@focus-reactive/payload-plugin-stacked-editing/client` inside it. It reads Payload's row label
context.

**Plugin order.** Put `stackedEditingPlugin` before plugins that wrap existing block labels
(`@focus-reactive/payload-plugin-presets` does this). Those plugins then keep the card and add their
own actions next to it.

## How it works

The plugin makes no schema changes. It adds no fields, hooks or endpoints.

1. **Server**: the plugin adds one client component, `StackedEditing`, to each selected
   collection's `admin.components.edit.beforeDocumentControls` (`elements.beforeDocumentControls`
   for globals). That slot renders **inside the document's `<Form>`**, which the rest of the design
   depends on.
2. **Trigger**: a capture-phase click listener catches clicks on `button.collapsible__toggle` of a
   `.blocks-field__row` / `.array-field__row`. That button is the header's click surface. Actions,
   the drag handle and the block name input sit above it, so they never reach it. The listener
   resolves the row's data path from Payload's DOM. The field path comes from the field wrapper id
   (`field-layout__0__items`), and the index comes from the row container id
   (`layout-0-items-row-2`). The two ids are cross-checked, because the row id alone is ambiguous
   for names that contain dashes. The listener then stops the inline toggle. Clicks are only
   handled for the plugin's own form and panels, so document drawers opened from a panel keep their
   own instance.
3. **Schema**: `resolveRowChain` walks the client collection/global config the way `RenderFields`
   renders it. It uses Payload's own `getFieldPaths` and `getFieldPermissions`. It sees through
   `row`, `collapsible`, unnamed groups and unnamed tabs, and descends into named groups and tabs.
   It resolves `blocks` rows by the row's `blockType` from form state, including `blockReferences`
   and config-level `blocks` (`config.blocksMap`). Each level yields the fields, `schemaPath` and
   permissions that Payload's `BlockRow` / `ArrayRow` would pass. Missing permissions fall back to
   `true`.
4. **Panels**: one Payload `Drawer` per level, each rendered inside the previous one, so Payload's
   `DrawerDepthProvider` offsets and narrows every new drawer. Each drawer body renders the row
   with Payload's `RenderFields` (`parentPath = rowPath`, `parentIndexPath = ""`,
   `parentSchemaPath`, `permissions`, `readOnly`), as `BlockRow` does. React context passes through
   the portal, so the fields stay bound to the document's form. There is no second form and no data
   copy. Save, autosave, drafts, validation and live preview work as usual.
5. **Reactivity**: if a row is moved, deleted or changes block type while its panel is open, that
   panel and every panel above it close.

### Live Preview

When Live Preview is open beside the editor (`useLivePreviewContext()`: previewing, iframe mode),
the panels stay in the **editor column**. They run from the column's left edge to the preview's left
edge, start below the document controls, and get a smaller `--gutter-h`, so each level is offset by
about one `--base` instead of a full gutter. The modal container stops catching pointer events, so
the preview can still be scrolled and clicked. The column is measured from Payload's DOM
(`.collection-edit__main` / `.global-edit__main`, `.live-preview-window`) and measured again on
resize and scroll. It is published as CSS variables on `<html>`.

The panels' fields belong to the document form, so Live Preview's form-state subscription sends
every keystroke typed in a panel to the preview. This works at any depth. With the preview closed,
or in popup mode, the panels are the usual full-height drawers.

### Click in the Live Preview (with visual editing)

The plugin works with `@focus-reactive/payload-plugin-visual-editing` without either package
depending on the other. When the editor clicks an element in the preview, the visual-editing
bridge dispatches a cancelable `payload:open-field` event on `window`, with
`detail: { path, collectionSlug | globalSlug, docId?, locale? }`.

If the event is about the document this edit view has open and the path lies inside an array or
blocks row (for example `sections.2.items.0.points.1.text`), stacked editing cancels the event,
opens one panel per row on the way down, scrolls to the field in the top panel, focuses it and
flashes a highlight ring. A later click replaces the open stack with the new chain; levels both
chains share stay mounted, so they do not flicker. For a top-level field the plugin closes its
panels and leaves the event alone, so the bridge focuses the field inline as before.

### Fields mounted twice

Payload keeps collapsed rows mounted, so while a panel is open its fields also exist (hidden) in
the inline row, and in a parent panel. The plugin handles that as follows:

- **Opening** a panel collapses the inline row (form state only; collapse preferences are not
  written), so only the panel copy is visible and focusable.
- **Text inputs, selects and other controlled fields** read form state and stay in sync.
- **Lexical rich text** reads the value only on mount. Without help, the hidden copy would show
  stale content after the panel closes, and editing it would overwrite the panel's edit. This was
  observed in testing with the fix disabled. When a panel closes, the plugin points `initialValue`
  of every rich text under that row that changed at its current `value`. That is Lexical's own
  remount trigger. The pass runs again after Lexical's idle write window (about 0.5 s). `value`
  (what gets saved) is never touched, and the form is not marked modified.
- **Duplicate DOM ids**: a `<label for>` in a panel would focus the hidden twin. The plugin
  redirects those clicks to the panel's own input.

## Limitations

- Before the admin has hydrated, a click on a row header expands it inline (Payload's default).
- Duplicate element ids exist while a panel is open (see above). Anything that looks fields up by
  id with `document.getElementById` finds the hidden inline copy first.
- Other editors that keep internal state and ignore form updates (custom fields, possibly code/JSON
  editors) are not re-synced the way Lexical is. Close the panel before editing the same field
  inline.
- Rows are matched by DOM class names and ids from Payload 3.90 (`collapsible__toggle`,
  `blocks-field__row`, `array-field__row`, `field-…`, `…-row-N`). A Payload release that changes
  them disables the plugin: clicks fall through to the inline behaviour. It does not break editing.
- Blocks inside Lexical rich text (the Lexical `BlocksFeature`) are not opened in panels.
- The card replaces Payload's whole block header label, including the inline `blockName` input. A
  block name you set still shows as the card's title, but it can no longer be edited from the
  header. A custom label that needs it can render Payload's `SectionTitle` next to `CardLabel`.
- A card's title follows the form live. Its thumbnail follows a changed upload as soon as the new
  id is in the form. Text in the panel titles and breadcrumbs only updates when it comes from a
  text or number field directly in the row.
- A newly added row appears as a collapsed card (in `panel` mode). It does not open in a panel by
  itself.
- The header is a single Payload button, so the plugin tells "label" from "chevron" from "open icon"
  by where the click lands. The icon is drawn with CSS on `.collapsible__actions-wrap`.

## Development

```bash
bun run build        # swc + d.ts
bun run test         # vitest: DOM path parsing, schema walking, breadcrumbs, editor re-sync
bun run check-types
bun run lint
```

`apps/dev` uses the plugin on `pages` and `playground`. The seeded playground document goes
`layout → Deep Nest → items[0] → callouts[0]` (blocks → array → blocks, with rich text at the
bottom) and `layout → nested → leaves` (blocks three deep).
