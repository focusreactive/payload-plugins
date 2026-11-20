# @focus-reactive/payload-plugin-relations-graph

See your Payload content model as a graph, and act on it.

Every collection and global is a box. Every `relationship`, `upload` and `join` field is an arrow, however deep it sits in groups, arrays, tabs or blocks. On top of the picture the plugin adds:

- **Used in N** — a button on every document that lists the documents referencing it.
- **Insights** — health checks for the content model.
- **Data** — live numbers on the graph: document counts, how often each relation is actually filled, files nothing points to.
- **Copy for AI** — the content model as Markdown, ready for an agent's system prompt.

The graph is built from the running Payload config (`payload.config`), the same object Payload builds the admin and the API from. It is never out of date and needs no build step.

## Install

```bash
npm install @focus-reactive/payload-plugin-relations-graph
yarn add @focus-reactive/payload-plugin-relations-graph
pnpm add @focus-reactive/payload-plugin-relations-graph
bun add @focus-reactive/payload-plugin-relations-graph
```

Requires Payload `^3.84.0` and React 19.

## Setup

```ts
// payload.config.ts
import { relationsGraph } from "@focus-reactive/payload-plugin-relations-graph";

export default buildConfig({
  plugins: [relationsGraph()],
});
```

Then regenerate the import map:

```bash
npx payload generate:importmap
```

Open **Relations graph** in the admin nav, or go to `/admin/relations-graph`.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `enabled` | `true` | `false` turns the plugin off without removing it. |
| `path` | `"/relations-graph"` | Admin route of the graph view. |
| `navLink` | `true` | Adds the link to the admin nav. |
| `access` | any logged-in user | `({ req }) => boolean`. Guards the view and every endpoint. |
| `exclude` | `[]` | Collection or global slugs to leave out. |
| `includeGlobals` | `true` | Show globals as nodes. |
| `includeHidden` | `false` | Show collections and globals flagged `admin.hidden` (usually plugin internals). |
| `references` | `true` | The "Used in N" control. `false`, or a list of collection slugs to limit it. |
| `insights` | `true` | Insights, the Data overlay and their endpoints. |

Collections and globals the current user cannot read are always left out, together with their arrows.

## The graph view

- Pan by dragging the background, zoom with the wheel, drag boxes to rearrange. Positions are remembered in the browser; **Reset layout** restores the automatic layout.
- Click a box to see what it points to and what points to it: field path, one or many, required, polymorphic, localized.
- Search by name; toggle globals and upload collections off when they clutter the picture.
- **Copy as Mermaid** copies a flowchart for docs, pull requests or Notion.

Arrow styles: solid for relationships, grey for uploads, dashed for joins (the reverse side of a relation). `[ ]` marks "has many".

## Used in N

Each document's edit view gets a **Used in N** button. It opens a drawer listing every document and global that references the document, grouped by source and field, each row linking to its edit page.

What it covers:

- relationship and upload fields at any depth, including blocks inside blocks;
- `hasMany` and polymorphic relations, and self-references;
- every locale;
- the published version and the latest draft — a reference that exists only in a draft is marked **Draft only**;
- globals as sources.

Only documents the current user can read are listed.

### Use it in a hook

```ts
import { findReferences } from "@focus-reactive/payload-plugin-relations-graph";
import { APIError } from "payload";

// Block deleting media that is still in use.
const beforeDelete = async ({ req, id }) => {
  const { total } = await findReferences({ req, collection: "media", id });
  if (total > 0) {
    throw new APIError("Still in use", 409);
  }
};
```

`findReferences({ req | payload, collection, id, limit = 10, overrideAccess = true, scanLimit = 1000, includeDrafts = true })` returns the same shape as the endpoint. Like the Local API, it skips access control unless you pass `overrideAccess: false`.

## Insights

The **Insights** button lists findings; clicking one highlights the boxes and arrows involved.

Schema checks (no database access):

| Check | Level | Fires when |
| --- | --- | --- |
| Required cycle | warning | Required relations form a loop, so no document in it can be created first. |
| Hub | info | 5+ relation fields from 3+ sources point at one collection. |
| Unlinked upload | info | No field points at an upload collection. |
| Isolated | info | A collection has no relations in or out. |
| Missing join | info | A collection is referenced but has no `join` field to show what uses it. |
| Ambiguous query path | info | Fields in different blocks share one `where` path, e.g. `sections.image`. |
| Deep relation | info | A relation sits inside 2+ nested blocks. |
| Wide polymorphic | info | A polymorphic field accepts 4+ collections. |

With **Data** on, findings from the content are added: files or lookup documents no relation field points to, required relations that are empty, relations that are never or rarely used.

## Data

The **Data** button loads live numbers and draws them on the graph:

- each box shows its document count and how many documents no relation field points to;
- each arrow shows the share of source documents that have the relation set, and gets thicker the more it is used;
- the side panel shows "set on X of Y" for every relation.

## Endpoints

All require the `access` check to pass (`403` otherwise).

| Endpoint | Returns |
| --- | --- |
| `GET /api/relations-graph` | The graph as JSON: `{ nodes, edges }`. |
| `GET /api/relations-graph?format=mermaid` | Mermaid flowchart. |
| `GET /api/relations-graph?format=markdown` | Content-model brief for AI agents. |
| `GET /api/relations-graph/references?collection=&id=&limit=` | Documents referencing one document. |
| `GET /api/relations-graph/insights[?data=true]` | `{ findings }`, plus `stats` and data findings with `data=true`. |
| `GET /api/relations-graph/stats[?scanLimit=]` | Document counts, fill rates, unreferenced counts. |

## Programmatic API

```ts
import {
  analyzeSchema,
  buildSchemaGraph,
  findReferences,
  toMarkdown,
  toMermaid,
} from "@focus-reactive/payload-plugin-relations-graph";

const graph = buildSchemaGraph(payload.config);
const brief = toMarkdown(graph); // paste into an agent's system prompt
const findings = analyzeSchema(graph); // e.g. fail CI on warnings
```

## Limitations

- **Rich text is not covered.** Links, relationships and uploads placed inside Lexical content are not fields in the config, so they are missing from the graph, from "Used in N" and from the unreferenced counts. "Not referenced by any relation field" does not mean "safe to delete".
- **Fields inside blocks are found by scanning documents.** Payload's SQL adapters cannot reliably query them. "Used in N" scans up to `scanLimit` documents per source collection (default 1000) and marks the result as partial beyond that. Stats scan up to 5000 by default and return `null` beyond that instead of estimating.
- **Tested on SQLite only.** Postgres shares the same query code; MongoDB is untested.
- **Read-only.** The graph does not edit the schema or documents.
- **Totals count per field.** A document that references another through two fields counts twice in "Used in N".

## License

MIT
