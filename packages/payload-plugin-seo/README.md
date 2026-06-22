# @focus-reactive/payload-plugin-seo

Live SEO analysis for [Payload CMS](https://payloadcms.com/) v3 + Next.js, powered by [Yoast](https://github.com/Yoast/wordpress-seo). Adds a real-time SEO drawer to the document editor — keyphrase optimization, on-page checks, readability, inclusive language, content vitals, and a Google SERP preview — without adding a single field to your database.

The plugin injects a button into the editor toolbar of each configured collection. Clicking it opens a drawer that reads the current (unsaved) form values, extracts the title, meta description, slug, body content, and images, and runs the Yoast analysis engine **entirely in the browser**. Nothing is persisted — there are zero new collections, globals, or fields.

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload + Next.js project.

```
I want to add live SEO analysis to my Payload CMS v3 + Next.js project using @focus-reactive/payload-plugin-seo.

## How it works

The plugin adds NO database fields, collections, or globals. It injects a button into the
document editor toolbar (admin.components.edit.beforeDocumentControls) of each configured
collection. The button opens a drawer that:
- Reads the live (unsaved) form values for the document
- Extracts title, meta description, slug, body content and images using dot-path config
- Resolves upload/relationship media into <img> tags via the Payload REST API
- Runs the Yoast engine (yoastseo + @yoast/search-metadata-previews) in the browser
- Shows tabs: Keyphrase, On-page SEO, Readability, Inclusive, Content vitals, SERP preview

It works with or without a focus keyphrase; keyphrase-specific checks unlock once you enter one.

## Installation

pnpm add @focus-reactive/payload-plugin-seo

## Step 1 — Register the plugin in payload.config.ts

import { seoPlugin } from '@focus-reactive/payload-plugin-seo'

// Inside buildConfig({ plugins: [...] })
seoPlugin({
  collections: [
    {
      slug: 'pages',
      fields: {
        seoTitle: 'seoTitle',           // dot-path; falls back to useAsTitle / 'title'
        metaDescription: 'metaDescription',
        slug: 'slug',                   // default: 'slug'
        content: 'sections',            // dot-path to the main content field (blocks/richText/textarea)
      },
    },
  ],
  site: { name: 'My Site', baseUrl: 'https://example.com', faviconUrl: '/favicon.ico' },
  supportedLocales: ['en'],            // language packs to load; default ['en']
})

## Step 2 — Import the admin styles

In your Payload admin CSS (e.g. app/(payload)/custom.scss):

@import "@focus-reactive/payload-plugin-seo/admin.css";

## Step 3 — Allow Next.js to transpile the Yoast UI packages

In next.config.mjs:

const nextConfig = {
  transpilePackages: ['@yoast/search-metadata-previews', '@yoast/components'],
}

## Important notes

- The plugin reads UNSAVED form values, so analysis updates live as you type (debounced ~1s).
- `fields.content` should point at your primary body field. The built-in extractor walks
  blocks, arrays, groups, tabs, lexical richText, and uploads, converting them to HTML.
- If the built-in extractor can't reach your content shape, supply `extractContentPath`:
  an importMap module path to a `(formValues) => string | Promise<string>` returning HTML.
- Non-English analysis requires the locale code in `supportedLocales`; the matching Yoast
  language pack is dynamically imported on demand.
- No GA4, no API keys, no server calls except resolving media URLs from your own Payload API.
```

---

## How It Works

```
Document editor (configured collection)
        │
        ▼
[ SeoButton ]  ← injected into admin.components.edit.beforeDocumentControls
        │  click
        ▼
   SEO Drawer (client-only)
        │
        ├─ read live form values (title, description, slug, content, keyphrase)
        ├─ collect upload/relationship refs → resolve via /api/{collection}?depth=0&locale=…
        ├─ hydrate values → walk tree → build HTML (lexical → HTML, images → <img>)
        ▼
   Yoast engine (in browser): Paper + EnglishResearcher + SeoAssessor
        │
        ▼
   Tabs: Keyphrase · On-page SEO · Readability · Inclusive · Content vitals · SERP preview
```

The analysis runs on a ~1 second debounce as form values change. **No data is written** — the drawer is a pure read-only overlay on top of the editor's current state.

---

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-seo
```

**Peer dependencies:** `payload ^3.0.0`, `@payloadcms/next ^3.0.0`, `@payloadcms/ui ^3.0.0`, `@payloadcms/richtext-lexical ^3.0.0`, `lucide-react ^0.469.0`. `next ^14 || ^15` and `react`/`react-dom ^18 || ^19` are optional peers.

The Yoast engine (`yoastseo`, `@yoast/search-metadata-previews`) ships as a direct dependency — you don't install it yourself, but you do need to transpile the two UI packages (see Quick Start step 3).

---

## Quick Start

### Step 1 — Register the plugin

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { seoPlugin } from "@focus-reactive/payload-plugin-seo";

export default buildConfig({
  plugins: [
    seoPlugin({
      collections: [
        {
          slug: "pages",
          fields: {
            seoTitle: "seoTitle",
            metaDescription: "metaDescription",
            slug: "slug",
            content: "sections",
          },
        },
      ],
      site: {
        name: "My Site",
        baseUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3000",
      },
      supportedLocales: ["en", "de", "fr", "es"],
    }),
  ],
});
```

This injects the **SEO** button into the document toolbar of every configured collection. A colored dot on the button reflects the current overall status (good / warn / bad).

### Step 2 — Import the admin styles

The drawer's components import their compiled CSS internally, but the package also ships it at `./admin.css` so you can include it explicitly in your admin stylesheet:

```scss
/* app/(payload)/custom.scss */
@import "@focus-reactive/payload-plugin-seo/admin.css";
```

### Step 3 — Transpile the Yoast UI packages

`@yoast/search-metadata-previews` and `@yoast/components` ship CSS inside `node_modules`, which Next.js (and Turbopack) won't process unless they're listed in `transpilePackages`:

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@yoast/search-metadata-previews", "@yoast/components"],
};

export default nextConfig;
```

---

## Configuration Reference

### Plugin Options

```ts
interface SeoPluginConfig {
  /** Skip injection entirely. Default: false */
  disabled?: boolean;
  /** Collections to attach the SEO drawer to. At least one is required. */
  collections: SeoCollectionConfig[];
  /** Site identity used in the SERP preview and permalink. */
  site?: SeoSiteConfig;
  /** Locale codes whose Yoast language packs may be loaded. Default: ['en'] */
  supportedLocales?: string[];
  /** Override the English UI strings (merged with defaults). */
  translations?: Translations;
}
```

### SeoCollectionConfig

```ts
interface SeoCollectionConfig {
  /** Collection slug to attach the drawer to. */
  slug: string;
  /** Dot-paths telling the plugin which fields hold the SEO inputs. */
  fields?: SeoFieldPaths;
  /**
   * importMap module-path to a custom client extractor
   * `(formData) => string | Promise<string>` returning HTML.
   * Example: "@/seo/my-extractor#default".
   * Default: built-in smart extractor.
   */
  extractContentPath?: string;
}
```

### SeoFieldPaths

```ts
interface SeoFieldPaths {
  /** Dot-path to the SEO title. Falls back to the collection's useAsTitle / `title`. */
  seoTitle?: string;
  /** Dot-path to the meta description. Absent → meta-description checks are disabled
   *  and the SERP snippet shows no description. */
  metaDescription?: string;
  /** Dot-path to the slug. Default: 'slug' */
  slug?: string;
  /** Dot-path to the primary content field (blocks / richText / textarea). */
  content?: string;
}
```

Dot-paths support nesting, e.g. `"meta.description"` or `"content.body"`.

### SeoSiteConfig

```ts
interface SeoSiteConfig {
  /** Site name shown in the SERP preview. */
  name?: string;
  /** Base URL used to build the permalink in the SERP preview. */
  baseUrl?: string;
  /** Favicon shown in the SERP preview. */
  faviconUrl?: string;
}
```

### Custom content extractor

```ts
type ExtractorFn = (data: Record<string, unknown>) => string | Promise<string>;
```

Provide one when the built-in extractor can't reconstruct your content shape. It receives the raw (unhydrated) form values and must return an HTML string. Reference it from config by importMap path:

```ts
// payload.config.ts
seoPlugin({
  collections: [{ slug: "pages", extractContentPath: "@/seo/my-extractor#default" }],
});
```

```ts
// src/seo/my-extractor.ts
export default function extractContent(data: Record<string, unknown>): string {
  return `<h1>${data.title}</h1><p>${data.body}</p>`;
}
```

---

## Content Extraction

When `extractContentPath` is **not** set, the plugin's built-in extractor:

1. **Reads** the value at `fields.content` from the live form values.
2. **Collects upload / relationship references** by walking the form schema (arrays, blocks, groups, tabs, rows, collapsibles, and lexical richText, including inline media nodes).
3. **Resolves media** by calling your Payload REST API per collection:
   `GET /api/{collection}?depth=0&locale={locale}&where[id][in][]=…` — fetching each doc's `url`, `mimeType`, and `alt`. Results are cached in-memory and invalidated when the drawer re-opens or content changes.
4. **Hydrates** the value tree (upload IDs → full docs) and walks it to build HTML:
   - Lexical richText → HTML via `@payloadcms/richtext-lexical/html`
   - `{ url, mimeType: "image/*", alt? }` → `<img src="…" alt="…" />`
   - `{ url, label | text | title }` → `<a href="…">…</a>`
   - Strings → `<p>…</p>`
   - Structural keys (`id`, `blockType`, `blockName`, `_template`, `order`) are skipped

This means image checks (alt text, keyphrase in alt, image count) work against the real, resolved media — not raw relationship IDs.

---

## The Analysis Drawer

The drawer presents six tabs, all derived from a single in-browser Yoast analysis pass (a `Paper` analyzed by `SeoAssessor` with the language-appropriate `Researcher`):

| Tab                       | What it checks                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keyphrase**             | Focus keyphrase usage — in title, slug, meta description, first paragraph, density, image alt, synonyms. Enter a keyphrase to unlock these checks. |
| **On-page SEO**           | Title width, meta description presence/length, internal & outbound links, heading structure.                                                       |
| **Readability**           | Sentence/paragraph length, transition words, passive voice, consecutive sentences.                                                                 |
| **Inclusive**             | Flags potentially exclusionary or non-inclusive language.                                                                                          |
| **Content vitals**        | Word count, sentence/paragraph counts, image & video counts, reading time, prominent words.                                                        |
| **Search result preview** | Live Google SERP preview (desktop + mobile) with keyphrase highlighting, built on `@yoast/search-metadata-previews`.                               |

**Without a keyphrase:** the drawer still runs and the On-page, Readability, Inclusive, Content vitals, and SERP tabs all populate. Only the keyphrase-specific assessments wait until you type a focus keyphrase and analysis runs.

---

## Localization

`supportedLocales` lists which locale codes the drawer may load Yoast language packs for. English is built in; other languages are dynamically imported on demand the first time the document is edited in that locale:

```ts
seoPlugin({
  collections: [{ slug: "pages", fields: { content: "sections" } }],
  supportedLocales: ["en", "de", "fr", "es"],
});
```

The active locale is taken from the admin and normalized to Yoast's `xx_XX` form (e.g. `en` → `en_EN`). Media is resolved per-locale so localized URLs and alt text are analyzed correctly. A locale not listed in `supportedLocales` falls back to English processing.

---

## Exports Reference

| Import path                                               | Exports                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-seo`                      | `seoPlugin`, and types `SeoPluginConfig`, `SeoCollectionConfig`, `SeoFieldPaths`, `SeoSiteConfig`, `ExtractorFn`                          |
| `@focus-reactive/payload-plugin-seo/admin.css`            | Compiled admin styles for the drawer & button                                                                                             |
| `@focus-reactive/payload-plugin-seo/components/SeoButton` | `SeoButton` — the toolbar button component (wired automatically by the plugin via the importMap; you normally never import this directly) |

---

## License

MIT © FocusReactive
