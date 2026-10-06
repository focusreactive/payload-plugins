# @focus-reactive/payload-plugin-json-form-builder

**A `json` field becomes real admin fields — and an admin can add new ones without a deploy.**

Text, number, date, select, checkbox, upload, rich text, lists, groups and tabs: the editor fills in a form, not a textarea. And when a field is missing, nobody writes a migration — it is added from inside the admin panel, in a builder, and it is there on the next save.

![The form a json field becomes](https://raw.githubusercontent.com/focusreactive/payload-plugins/main/packages/payload-plugin-json-form-builder/docs/form.png)

The unusual part: **there is no schema in your repository.** The shape lives inside the value itself. Every node says what it is, so the form can be drawn from the data alone, and changing the shape is a content edit rather than a deploy. Your frontend never sees that bookkeeping: everything outside the app reads plain values by key.

```jsonc
// what is stored                            // what your site receives
[                                            {
  { "name": "hero",                            "hero": {
    "type": "collapsible",                       "title": "Hackathon",
    "fields": [                                  "live": true
      { "name": "title", "type": "text",       }
        "value": "Hackathon" },              }
      { "name": "live", "type": "checkbox",
        "value": true } ] }
]
```

Sections are a list, like every level inside them, so they keep the order they are written in and are dragged in the form itself. They still reach the site as an object keyed by name — a list of named nodes and an object of keys are the same thing to a template.

---

## Why this and not JSON Schema

Libraries like `rjsf` and `jsonforms` render a form **from a schema you write in code**. That is a different job. Here the schema is produced by the person filling the form, stored next to their content, and versioned with it. Use this when the shape differs per document, per page or per client, and shipping a migration for every new field is the thing you are trying to avoid.

## What you get

**A form instead of a textarea.** Thirteen kinds, nested as deep as you like, drawn with Payload's own inputs — the upload field picks from your Media collection, rich text is the lexical editor your project configured, a list is a list of cards you drag.

**A builder, in the admin.** Behind the gear: a sidebar of sections, a canvas of the one you are on, and a palette of kinds on the right. Pick a kind, name the key, set it required, give it a minimum. A new field reaches every row of a list that already has rows, and no deploy is involved.

![The builder](https://raw.githubusercontent.com/focusreactive/payload-plugins/main/packages/payload-plugin-json-form-builder/docs/builder.png)

**Sections of your own.** A section is a named group at the root of the value, and it is what a template reads: `settings.hero.title`. Add one, drag it, hide it from the site without deleting it.

**Shared sections.** Build a section once, in the plugin's own global, and point many documents at it. Each keeps its own values; the shape stays in one place and every document follows it. Switched on by one option — see [`library`](#library).

**A JSON view, always.** The same value as code, for reading, diffing and the occasional hand fix. Editable by whoever may build.

**Validation that behaves like Payload's.** `required`, `min`/`max`, `minRows`/`maxRows` are judged on the server, the save is refused, the field is marked, and the message names the path.

**Rich text that round-trips.** Stored as html, written by Payload's own converters and read back by a parser kept in step with them.

**Plain values for the site.** No tree-walking in your templates.

## Requirements

- Payload CMS `^3.84.0`
- React `^19`
- `@payloadcms/richtext-lexical` — only if you use the rich text kind

---

## Setup

### 1. Install

```bash
pnpm add @focus-reactive/payload-plugin-json-form-builder
```

### 2. Register the plugin

```ts
// payload.config.ts
import { jsonFormPlugin } from '@focus-reactive/payload-plugin-json-form-builder'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

export default buildConfig({
  plugins: [
    jsonFormPlugin({
      richText: { editor: lexicalEditor() },
    }),
  ],
})
```

The plugin adds one global of its own — `json-form` — and no collections. It is where the rich text anchor lives, and it is hidden from the admin until you put fields in it (see [`global`](#global)).

### 3. Add the field

Anywhere a field may go — a collection, a global, a tab, inside a block, several times in one document:

```ts
import { jsonField } from '@focus-reactive/payload-plugin-json-form-builder'

export const Page: CollectionConfig = {
  slug: 'pages',
  fields: [
    jsonField({ name: 'settings', label: 'Settings' }),
  ],
}
```

`jsonField()` returns an ordinary `JSONField`, so everything Payload accepts on one — `required`, `defaultValue`, `admin.condition`, `hooks` — works as usual and is deep-merged over the defaults.

### 4. Regenerate the import map

```bash
pnpm payload generate:importmap
```

The plugin points the field at its own admin component, so the import map has to be rebuilt once after installing — and again if you move the field to a collection that had none.

That is all. Styles travel with the components; there is nothing to import.

---

## Options

```ts
jsonFormPlugin({
  build: true,
  global: { slug: 'json-form', fields: [] },
  library: true,
  richText: { editor: lexicalEditor(), holds: { headings: true, quotes: true, rules: true } },
  uploads: 'media',
})
```

Most projects set two of these: `richText`, because a rich text node needs an editor to be drawn with, and `library`, when sections are worth sharing. The rest have defaults that fit.

### `build`

Who may open the builder and edit the JSON by hand. Everyone, by default — the field already sits behind the document's own update access, so this is a second gate, not the first one.

```ts
build: true                          // anyone who can edit the document
build: 'admin'                       // one role
build: ['admin', 'editor']           // any of these
build: ({ user }) => user?.isStaff   // your own rule
```

A role name is matched against `user.role` and `user.roles`, which is where most projects keep it. If yours keeps it somewhere else, pass the predicate.

Set it per field to override the plugin for one place: `jsonField({ build: 'admin' })`.

### `global`

The plugin's own global, added to the config the way a plugin adds a collection — you declare nothing. It is the plugin's place in the schema: the rich text anchor lives there instead of being pushed into a document you own, and the same global is the obvious home for json forms that belong to the site rather than to a page.

```ts
global: {}                                                  // the default: `json-form`, hidden
global: { fields: [jsonField({ name: 'components' })] }     // filled, and visible
global: { slug: 'site-json', label: 'Site JSON' }
global: false                                               // no global — and no rich text
```

An empty global is `admin.hidden`, since the only field in it is one nobody can see. Put fields in it and it appears; `admin`, `access`, `label` and `hooks` are passed straight through if you want to say otherwise. `false` leaves the config without the global, which also leaves rich text nowhere to anchor.

### `library`

Shared sections: one field in the plugin's own [`global`](#global) holding sections that documents follow.

```ts
library: false                                  // the default: no shared sections
library: true                                   // a `shared` field, labelled "Shared sections"
library: { name: 'blocks', label: 'Blocks', description: 'Built once, used everywhere' }
```

A section built there is attached to a document from **From library**, next to *Add section*. The document gets its own copy of the values and a note of where the shape came from, so:

- **values are the document's.** Changing them in the library later changes nothing anywhere;
- **the shape is the library's.** A field added there appears in every document that follows the section, one removed disappears, one retyped is retyped. It is read on the way out, so a document is never stale;
- **keys are frozen.** Once a section exists in the library, its keys and its fields' keys cannot be renamed — only added to or removed. Renaming would leave every document that followed it pointing at nothing;
- **a section that follows one is not editable in the builder.** It is left out of the builder's sidebar and carries a `global` chip in the form, because its shape is not this document's to change;
- **removing it from the library is safe.** The documents keep what they have; those sections simply become their own again.

A document may not follow two sections with the same key, so one whose key is already taken is offered but not selectable.

### `richText`

```ts
richText: false                              // the kind is withdrawn from the palette
richText: { editor: lexicalEditor() }        // the full default feature set
richText: { editor: myEditor, holds: { headings: false, quotes: false, rules: false } }
```

**`editor`** — the lexical editor a rich text node is edited with.

**`holds`** — which block nodes that editor can actually hold. Everything, by default, because that is what Payload's own converters write. Narrow it when you pass a reduced editor: a heading handed to an editor with no heading feature is a node it cannot draw, and a heading read back as a bold paragraph is better than one that disappears.

| key | off means |
| --- | --- |
| `headings` | `<h1>`–`<h6>` are read as a bold paragraph |
| `quotes` | `<blockquote>` is read as a plain paragraph |
| `rules` | `<hr>` is dropped |

### `uploads`

The collection the upload kind picks files from. Defaults to `'media'`. Set `false` and the kind leaves the palette.

---

## The value

A node is an object that names its kind. Containers hold `fields`, a list holds `rows`, everything else holds a `value`.

| kind | holds | drawn as |
| --- | --- | --- |
| `text` | `value` | a text input |
| `textarea` | `value` | a textarea |
| `number` | `value`, plus `min` / `max` | a number input |
| `date` | `value`, an ISO string | the date picker |
| `richText` | `value`, html | the lexical editor |
| `upload` | `value`, a media url | the upload field |
| `checkbox` | `value`, true or false | a checkbox |
| `select` | `value`, plus `options: string[]` | a select |
| `array` | `rows`, plus `minRows` / `maxRows` | a sortable list |
| `group` | `fields` | a titled group |
| `collapsible` | `fields` | an accordion |
| `tabs` | `fields`, tabs only | a strip of tabs |
| `tab` | `fields` | one tab |

Every node also takes:

| key | does |
| --- | --- |
| `name` | the key the site reads it by |
| `label` | what the admin calls it; the name is read as words otherwise |
| `description` | a line under the field |
| `required` | a save is refused while it is empty, naming the path |
| `readOnly` | shown, not editable — and everything under it too |
| `hidden` | kept in the admin, left out of what the site gets |
| `showIf` | `{ field: 'kind', equals: 'video' }` — drawn only while a sibling matches |

## What your site receives

Reads from outside the app get plain values, so a template or a React component reads `settings.hero.title` by key. Hidden nodes are left out, so nothing has to check a flag.

An `upload` node stores a url and nothing else, but it does not arrive as one: on the way out it is looked up in your uploads collection by filename and handed over as the document, the way a real `upload` field reads. So a template gets `logo.url`, `logo.alt`, `logo.width` — everything the file knows about itself — and one query answers a whole document however many files it holds. A url that matches no file stays the string it is, which is what a url pasted from elsewhere should be.

Reads from inside the app keep the typed shape, and that is not a setting: the admin draws the form from the types, and a script that read flat values and wrote the document back would erase the shape. A session is what tells the two apart — the admin always has one; a build or a frontend arriving over HTTP does not.

To flatten a value yourself — in a bridge, a migration, a test:

```ts
import { flatten } from '@focus-reactive/payload-plugin-json-form-builder/shared'
```

`flatten` takes an optional resolver for upload urls; without one they stay urls, since looking a file up needs the Payload runtime. `/shared` is pure functions only. It pulls in neither React nor the Payload runtime.

---

## Rich text

A rich text node stores **html**, not lexical state, so your site can print it without a serializer.

That means every edit is a round trip: lexical out to html, html back to lexical when the field is reopened. The plugin owns both directions and keeps them in step. If you narrow the editor, narrow `holds` with it — anything the writer emits and the reader cannot parse is content that disappears on the next edit.

**The anchor.** `RenderLexical` mounts an editor by pointing at a richText field Payload has already sanitized; it cannot be built from an editor config alone. A rich text value inside json is not a field to Payload — only a key in an object — so one real field has to exist for the editor to aim at. The plugin adds it for you: a `virtual`, `admin.hidden` richText field in its own [`global`](#global). It stores nothing and creates no column. You will see one extra key in that global's generated types, and that is the whole footprint.

---

## Troubleshooting

**`jsonFormBuilderPlugin config not found`** — the plugin is not in the `plugins` array, or the field is rendered by an app whose config does not include it.

**The field renders as Payload's plain JSON textarea** — the import map is stale. Run `payload generate:importmap`.

**Rich text is missing from the palette** — `richText` is `false`, or `global` is, so there was nowhere to put the anchor.

**An icon, a colour or a custom node vanishes when the field is reopened** — the editor can write a node the parser does not read. Custom nodes are not supported yet; see below.

**The upload field is empty but the JSON holds a url** — the file is not in your uploads collection under that name. The field says so rather than pretending the value is empty, and the url is kept until you replace it.

## Good to know

- **The Code view cannot break the document.** Text that does not parse stays in the editor and never reaches the form state, so a stray comma costs you nothing.
- **A save is never blocked in the browser.** Validation runs on the server, like every other Payload field: the save is refused, the field is marked, your changes are still there.
- **Custom lexical nodes are not configurable yet.** The plugin ships the default converter pair. A node of your own needs both directions registered, and a function cannot reach a client component through a config — it will arrive as a provider in a later version.
- **The admin UI is English only.**
- **`RenderLexical` is marked experimental by Payload** and may change in a minor release. The rich text kind is the one part of this plugin that rides on that.

## License

MIT
