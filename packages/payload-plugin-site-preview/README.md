# @focus-reactive/payload-plugin-site-preview

Live preview and click-to-edit for [Payload CMS](https://payloadcms.com/) on **any frontend that renders HTML** — a static site generator, a template engine, a PHP app. No React, no client SDK on the site.

Payload's own live preview expects the frontend to subscribe to form data and re-render itself, which a Nunjucks, Liquid, Hugo or Eleventy page cannot do. This plugin works the other way round: the CMS asks your site to render the document with its own templates and shows that page in the admin's preview, proxied through the CMS so it has one origin.

## Features

- **Preview of saved and unsaved edits** — the page is rendered by your site's real templates, so every change shows correctly: reordered blocks, hidden rows, conditionals, formatted dates.
- **Click-to-edit** — click a section or card in the preview and the admin opens it: switches to the right tab (including tabs inside blocks), expands collapsed rows, scrolls to the field.
- **Other documents in a drawer** — a click on something that lives in another collection (the header on a settings document, a FAQ entry, an author) opens that document in Payload's drawer, over the page and without losing unsaved edits.
- **Form to preview** — focusing a field in the admin scrolls the preview to its block and highlights it.
- **Nothing on the site but attributes** — the preview scripts are injected by the CMS; the site prints `data-payload-*` attributes in preview renders only.

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-site-preview
```

## Usage

### 1. Register the plugin

```ts
// payload.config.ts
import { sitePreviewPlugin } from "@focus-reactive/payload-plugin-site-preview";

export default buildConfig({
  plugins: [
    sitePreviewPlugin({
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

Astro, with on-demand rendering (`output: "server"` or `prerender = false`):

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

Any Node server with a template engine — Express and Nunjucks here, the same for Liquid or Handlebars,
and for an Eleventy site's own templates:

```js
app.all("/api/preview", express.json({ limit: "5mb" }), async (req, res) => {
  if (req.get("x-preview-secret") !== process.env.PREVIEW_SECRET) return res.sendStatus(401);
  const page = req.method === "POST" ? req.body.doc : await getPage(req.query.slug);
  res.send(nunjucks.render("page.njk", { page, preview: true }));
});
```

A site that cannot render on request — a static host serving its build — can still have the preview
of saved pages and click-to-edit: point `site` at the deployed page and set `unsaved: false`. Its
build then has to print the attributes, which the public site would carry too.

### 4. Mark what can be clicked

Print the attributes **only in preview renders** — they name CMS fields and documents.

| Attribute | Opens |
|---|---|
| `data-payload-id="<row id>"` | a row of the document — any array or blocks row, at any depth; every row has an `id` in Payload's API response |
| `data-payload-doc="<collection>:<id>"` | another document, in a drawer |
| `data-payload-field="<field>"` | with either of the above: a group or tab inside that row or document |

Nunjucks:

```njk
<section class="hero" {% if preview %}data-payload-id="{{ hero.id }}"{% endif %}>
  {% for card in hero.cards %}
  <div class="card" {% if preview %}data-payload-id="{{ card.id }}"{% endif %}>…</div>
  {% endfor %}
</section>

<header {% if preview %}data-payload-doc="settings:{{ settings.id }}" data-payload-field="header"{% endif %}>…</header>
```

Astro:

```astro
<section data-payload-id={preview ? hero.id : undefined}>…</section>
```

The innermost marked element wins, so a card inside a marked section opens the card. Form controls and in-page anchors inside marked elements keep working; other links do not navigate in the preview.

## Options

| Option | Type | Default | |
|---|---|---|---|
| `collections` | `CollectionSlug[]` | — | Collections whose documents are pages of the site |
| `site` | `(args) => SiteRequest \| null` | — | Where the site renders a document: `{ url, headers?, body?, basePath? }` |
| `scrollOffset` | `string` | — | `'80px'`, or the selector of a fixed header, measured when the preview scrolls |
| `depth` | `number` | `2` | How deep relationships in unsaved form data are populated |
| `unsaved` | `boolean` | `true` | Render unsaved edits; `false` for a site that only serves its build |

## What it relies on

Click-to-edit drives the admin's DOM where Payload offers no API: rows are found by the ids Payload renders (`sections-1-items-row-3`), tabs are switched by their buttons (a tabs field keeps its active tab in local state), a drawer is found by its close button. Rows are expanded through form state (`SET_ROW_COLLAPSED`), and a drawer opens on the right tab through the document's preferences. After upgrading Payload, click a nested card in the preview before shipping.

## Not covered yet

- **Globals** — a global cannot be a previewed page, and a click cannot open one: Payload's document drawer takes collections only.
- **Drafts and localization** — unsaved form data is read without a locale and as a published document, and the admin's locale is not passed to `site`. A site with drafts or several locales renders what `site` returns for the saved document; check that it is the version you expect.
- **Links to other pages** — the preview scrolls to anchors on the page, but does not follow links elsewhere.

## Good to know

- **Analytics** — the preview is a real render of your page, trackers included. Leave them out of preview renders, or every preview reload is a visit.
- **Rate limits** — a page loads its files through the CMS (`/api/site-preview/<collection>/<id>/_/…`), often a hundred at a time; exempt that path from a rate limiter.
- **Links** — the page's relative urls resolve against the CMS proxy; in-page anchors scroll, links to other pages are not followed.

## License

MIT
