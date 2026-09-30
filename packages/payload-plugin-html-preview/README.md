# @focus-reactive/payload-plugin-html-preview

Live preview and click-to-edit for [Payload CMS](https://payloadcms.com/) on **any frontend that renders HTML** — a static site generator, a template engine, a PHP app. No React, no client SDK on the site.

Payload's own live preview expects the frontend to subscribe to form data and re-render itself, which a Nunjucks, Liquid or Eleventy page cannot do. This plugin works the other way round: the CMS asks your site to render the document with its own templates and shows that page in the admin's preview, proxied through the CMS so it has one origin.

## Features

- **Preview of saved and unsaved edits** — the page is rendered by your site's real templates, so every change shows correctly: reordered blocks, hidden rows, conditionals, formatted dates.
- **Click-to-edit** — click a section or card in the preview and the admin opens it: switches to the right tab (including tabs inside blocks), expands collapsed rows, scrolls to the field.
- **Other documents in a drawer** — a click on something that lives in another collection (the header on a settings document, a FAQ entry, an author) opens that document in Payload's drawer, over the page and without losing unsaved edits.
- **Form to preview** — focusing a field in the admin scrolls the preview to its block and highlights it.
- **Nothing on the site but attributes** — the preview scripts are injected by the CMS; the site prints `data-payload-*` attributes in preview renders only.

## Installation

In the CMS:

```bash
pnpm add @focus-reactive/payload-plugin-html-preview
```

On the site, only what its render endpoint needs:

| Stack | Install |
|---|---|
| Astro | an adapter for on-demand rendering: `npx astro add netlify` (or `node`, `vercel`) |
| Eleventy | `npm install nunjucks`: the function renders the templates without Eleventy |
| Nunjucks | nothing new; `express` if the endpoint is a Node server |

No script or SDK goes on the site: the CMS injects the preview's scripts into the page it renders.

## Usage

### 1. Register the plugin

```ts
// payload.config.ts
import { htmlPreviewPlugin } from "@focus-reactive/payload-plugin-html-preview";

export default buildConfig({
  plugins: [
    htmlPreviewPlugin({
      collections: ["pages"],
      // Where the site renders a document. `data` is the unsaved form data, or null for the saved document.
      site: async ({ req, id }) => {
        // Pass `req`, and keep access control on: this decides what a signed-in editor gets to see.
        const page = await req.payload.findByID({ collection: "pages", id, req, overrideAccess: false });
        return {
          url: `https://my-site.com/api/preview?slug=${page.slug}`,
          headers: { "X-Preview-Secret": process.env.PREVIEW_SECRET ?? "" },
        };
      },
      // Keeps the preview's scroll clear of a fixed header: a px length, or the header's selector.
      scrollOffset: ".header",
    }),
  ],
});
```

### 2. Regenerate the import map

```bash
pnpm payload generate:importmap
```

The plugin adds a component to the edit view of each listed collection.

### 3. Give the site a render endpoint

The plugin calls the `url` you return:

| Request | The site answers with |
|---|---|
| `GET url` | the saved document's page |
| `POST url` with `{ "doc": { ... } }` as JSON | the page rendered from that document — the editor's unsaved form data, read like a stored document (relationships populated, `afterRead` hooks run) |

Relative urls in the page (`css/app.css`, `img/logo.svg`) are fetched from the site through the CMS. If the page lives in a subdirectory, return `basePath: "nyc/"` or send an `X-Preview-Base: nyc/` header.

Check the secret in the endpoint: this is how pages that are not public in Payload get rendered.

The endpoint renders with the templates the site is built from, so what it takes depends on the stack:

| Stack | Endpoint |
|---|---|
| Astro | a page rendered on demand |
| Eleventy | a function that renders the site's Nunjucks templates |
| Nunjucks in a Gulp or Webpack build, or on a Node server | a function or a route with the build's environment and filters |

#### Astro

With on-demand rendering (`output: "server"` or `prerender = false`):

```astro
---
// src/pages/preview/[slug].astro
export const prerender = false;

if (Astro.request.headers.get("x-preview-secret") !== import.meta.env.PREVIEW_SECRET) {
  return new Response("Forbidden", { status: 401 });
}
const page =
  Astro.request.method === "POST"
    ? (await Astro.request.json()).doc
    : await getPage(Astro.params.slug); // your usual Payload query
---
<PageLayout page={page} preview />
```

#### Eleventy

The templates do not need Eleventy to render: a Nunjucks environment on `_includes` with the site's
filters renders them the same. Keep the filters in a module that both `.eleventy.js` and the
function import. On Netlify:

```js
// netlify/functions/preview.mjs
import nunjucks from "nunjucks";
import filters from "../../src/filters.js"; // the object .eleventy.js registers

const env = nunjucks.configure("src/_includes", { autoescape: true });
for (const [name, filter] of Object.entries(filters)) env.addFilter(name, filter);

export default async (req) => {
  if (req.headers.get("x-preview-secret") !== process.env.PREVIEW_SECRET) {
    return new Response("Forbidden", { status: 401 });
  }
  const page =
    req.method === "POST"
      ? (await req.json()).doc
      : await getPage(new URL(req.url).searchParams.get("slug")); // your usual Payload query
  // The same data the template gets in the build.
  return new Response(env.render("layouts/page.njk", { page, preview: true }), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};
```

```toml
# netlify.toml — the function reads the templates from disk, so they ship with it
[functions]
  included_files = ["src/_includes/**"]
```

Shortcodes and globals the templates use have to be registered on this environment too.

#### Nunjucks

A site built with Gulp or Webpack renders its pages with a Nunjucks environment the build sets up.
The endpoint imports the same modules — that environment with its filters, and whatever turns
Payload's response into the data each template gets — and renders one page. On a Node server it is
a route:

```js
app.all("/api/preview", express.json({ limit: "5mb" }), async (req, res) => {
  if (req.get("x-preview-secret") !== process.env.PREVIEW_SECRET) return res.sendStatus(401);
  const page = req.method === "POST" ? req.body.doc : await getPage(req.query.slug);
  res.send(env.render("page.njk", { page, preview: true }));
});
```

On a static host it is a function, like the Eleventy one above. Two things break it there:

- **Files read from disk** — templates, settings, data files — have to ship with the function
  (`included_files` on Netlify, `includeFiles` on Vercel).
- **`require` with a computed path** — `` require(`./settings/${name}`) `` — is invisible to the
  function bundler. Write `require(path.join(dir, name))` and ship the directory as above.

A site that cannot render on request — a static host serving its build — can still have the preview
of saved pages and click-to-edit: point `site` at the deployed page and set `unsaved: false`. Its
build then has to print the attributes, which the public site would carry too.

### 4. Mark what can be clicked

Print the attributes **only in preview renders** — they name CMS fields and documents. The endpoints
above render with `preview: true` and the build never sets it, so the public site carries none of them.

| Attribute | Opens |
|---|---|
| `data-payload-id="<row id>"` | a row of the document — any array or blocks row, at any depth; every row has an `id` in Payload's API response |
| `data-payload-doc="<collection>:<id>"` | another document, in a drawer |
| `data-payload-field="<field>"` | with either of the above: a group or tab inside that row or document |

Nunjucks, and Eleventy's Nunjucks templates:

```njk
<section class="hero" {% if preview %}data-payload-id="{{ hero.id }}"{% endif %}>
  {% for card in hero.cards %}
  <div class="card" {% if preview %}data-payload-id="{{ card.id }}"{% endif %}>…</div>
  {% endfor %}
</section>

<header {% if preview %}data-payload-doc="settings:{{ settings.id }}" data-payload-field="header"{% endif %}>…</header>
```

Astro, with `preview` passed down as a prop from the preview page (`<PageLayout page={page} preview />`):

```astro
---
const { hero, preview } = Astro.props;
---
<section data-payload-id={preview ? hero.id : undefined}>
  {hero.cards.map((card) => <div class="card" data-payload-id={preview ? card.id : undefined}>…</div>)}
</section>
```

Astro leaves out an attribute whose value is `undefined`, so the normal build prints nothing.

The innermost marked element wins, so a card inside a marked section opens the card. Form controls and in-page anchors inside marked elements keep working; other links do not navigate in the preview.

## Options

| Option | Type | Default | What it does |
|---|---|---|---|
| `collections` | `CollectionSlug[]` | — | Collections whose documents are pages of the site; each gets the preview and click-to-edit in its edit view |
| `site` | `(args) => SiteRequest \| null` | — | Where the site renders a document. Called for every render of the preview; `null` shows nothing for that document |
| `scrollOffset` | `string` | — | Room for a fixed header when the preview scrolls to a block: `'80px'`, or the header's selector (`'.header'`), measured at scroll time |
| `depth` | `number` | `2` | How deep relationships in unsaved form data are populated before it is sent to the site. Match the depth the site reads a saved document with |
| `unsaved` | `boolean` | `true` | Sends the editor's unsaved edits to the site as they type. `false` for a site that only serves its build: the preview shows the saved page, click-to-edit still works |

What `site` gets:

| Argument | |
|---|---|
| `req` | The admin's request. Pass it to Payload queries with `overrideAccess: false`, so the preview shows only what the editor may read |
| `collection`, `id` | The document being edited |
| `data` | The unsaved form data, read like a stored document (relationships populated, `afterRead` hooks run), or `null` for the saved document. With data the plugin POSTs to `url`, without it GETs |

What it returns:

| Field | |
|---|---|
| `url` | The address that answers with the page's HTML |
| `headers` | Sent with the request; the preview secret goes here |
| `body` | The body of an unsaved render. Defaults to `{ "doc": <form data> }` as JSON |
| `basePath` | The page's directory on the site (`nyc/`), which its relative urls resolve against. Defaults to the response's `X-Preview-Base` header, then the site root |

## What it relies on

Click-to-edit drives the admin's DOM where Payload offers no API: rows are found by the ids Payload renders (`sections-1-items-row-3`), tabs are switched by their buttons (a tabs field keeps its active tab in local state), a drawer is found by its close button. Rows are expanded through form state (`SET_ROW_COLLAPSED`), and a drawer opens on the right tab through the document's preferences. After upgrading Payload, click a nested card in the preview before shipping.

## Not covered yet

- **Globals** — a global cannot be a previewed page, and a click cannot open one: Payload's document drawer takes collections only.
- **Drafts and localization** — unsaved form data is read without a locale and as a published document, and the admin's locale is not passed to `site`. A site with drafts or several locales renders what `site` returns for the saved document; check that it is the version you expect.
- **Links to other pages** — the preview scrolls to anchors on the page, but does not follow links elsewhere.

## Good to know

- **Analytics** — the preview is a real render of your page, trackers included. Leave them out of preview renders, or every preview reload is a visit.
- **Rate limits** — a page loads its files through the CMS (`/api/html-preview/<collection>/<id>/_/…`), often a hundred at a time; exempt that path from a rate limiter.
- **Links** — the page's relative urls resolve against the CMS proxy; in-page anchors scroll, links to other pages are not followed.

## License

MIT
