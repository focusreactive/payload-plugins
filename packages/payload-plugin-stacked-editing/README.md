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

## Using it

- **Click a row header** (blocks or array) to open the row in a panel. A click on a row inside a
  panel stacks another panel on top.
- **Breadcrumbs** read `Document / Field / Row / Field / Row …`. A row crumb goes back to that
  row's panel. A field crumb goes back to the panel that contains the field. The document crumb
  closes every panel.
- **Escape**, the close button or the strip to the left closes the top panel.
- **Alt/Option-click** a row header to expand or collapse it inline, the way Payload does it.
- Row actions (the `…` menu, drag handle, block name input) work as before.
- Row titles come from the block name, or else from a `title`/`name`/`label`/`heading`/`headline`
  field. Otherwise the crumb reads like Payload's own row label, for example `Hero 01`.

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
- A newly added row still opens inline, as Payload does it. Click its header to open it in a panel.

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
