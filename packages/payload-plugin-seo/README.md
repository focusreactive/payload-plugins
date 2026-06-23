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
  the lookup key for a `ContentExtractor` you register via `registerContentExtractors` from
  `@focus-reactive/payload-plugin-seo/content`. The extractor receives hydrated form values
  and returns `ContentNode[]` — a structured Intermediate Representation the plugin serializes to HTML internally.
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
   * Lookup key for a registered ContentExtractor.
   * Set this to the same string you pass as the key in registerContentExtractors().
   * Convention: use the module path of the extractor file, e.g. "@/seo/my-extractor#default".
   * The extractor runs in the browser on hydrated, unflattened form values and returns ContentNode[].
   * Register it from an admin-mounted client module — see "Content Extraction" below.
   * Default: the built-in document walker.
   */
  extractContentPath?: string;
}
```

### SeoFieldPaths

```ts
interface ContentSelection {
  /** Dot-paths to walk, in order. Omitted or empty = whole document root. */
  include?: string[];
  /** Dot-paths to skip (merged with auto-excluded seoTitle/metaDescription/slug). */
  exclude?: string[];
}

interface SeoFieldPaths {
  /** Dot-path to the SEO title. Falls back to the collection's useAsTitle / `title`. */
  seoTitle?: string;
  /** Dot-path to the meta description. Absent → meta-description checks are disabled
   *  and the SERP snippet shows no description. */
  metaDescription?: string;
  /** Dot-path to the slug. Default: 'slug' */
  slug?: string;
  /**
   * Built-in content selection. A string is a single field path (back-compat).
   * An object selects include/exclude paths over the whole document.
   * Ignored when extractContentPath is set and registered.
   */
  content?: string | ContentSelection;
}
```

Dot-paths support nesting, e.g. `"meta.description"` or `"content.body"`.

**`content` selection semantics:**

| Value                                | Behavior                                                   |
| ------------------------------------ | ---------------------------------------------------------- |
| `"blocks"` (string)                  | Walk that one field path. Back-compat — unchanged from v1. |
| `{ include: ["blocks", "excerpt"] }` | Walk each listed path in order, concatenated.              |
| `{ exclude: ["meta"] }` (no include) | Walk the whole document root, skipping excluded subtrees.  |
| `{}` / `{ include: [] }`             | Walk the whole document root.                              |

**Automatic metadata exclusion:** the configured `seoTitle`, `metaDescription`, and `slug` paths are always excluded from body content so their text is not double-counted in the Yoast analysis.

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

## Content Extraction

### The `ContentNode` Intermediate Representation

The plugin represents page content as a flat array of typed nodes before serializing to HTML. This is the `ContentNode` union exported from `@focus-reactive/payload-plugin-seo/content`:

```ts
type ContentNode =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "link"; href: string; text: string }
  | { type: "image"; src: string; alt?: string }
  | { type: "video"; src: string; poster?: string }
  | { type: "html"; html: string }; // lexical-converted or raw HTML escape hatch
```

Serialization to HTML (for the Yoast engine) happens entirely inside the plugin. Custom extractors produce `ContentNode[]`; they never construct HTML strings directly.

### Builder helpers

The `/content` subpath exports pure builder functions. Each helper returns `null` for empty or missing input, so you can call `.filter(Boolean)` on an array of helper results:

```ts
import {
  heading, // heading(level: 1|2|3|4|5|6, text?: string | null): ContentNode | null
  paragraph, // paragraph(text?: string | null): ContentNode | null
  link, // link(href?: string | null, text?: string | null): ContentNode | null
  image, // image(src?: string | null, alt?: string | null): ContentNode | null
  video, // video(src?: string | null, poster?: string | null): ContentNode | null
  richText, // richText(lexicalValue: unknown): ContentNode | null  (converts via convertLexicalToHTML; null when empty)
  html, // html(raw?: string | null): ContentNode | null
} from "@focus-reactive/payload-plugin-seo/content";
import type {
  ContentNode,
  HeadingLevel,
} from "@focus-reactive/payload-plugin-seo/content";
```

### Built-in extractor

When `extractContentPath` is not set (or points to an unregistered key), the plugin's built-in extractor runs:

1. **Selects** the subtree(s) specified by `fields.content` — a single field path, an `include` list, or the whole document root.
2. **Collects upload / relationship references** by walking the form schema (arrays, blocks, groups, tabs, rows, collapsibles, and lexical richText, including inline media nodes).
3. **Resolves media** by calling your Payload REST API per collection:
   `GET /api/{collection}?depth=0&locale={locale}&where[id][in][]=…` — fetching each doc's `url`, `mimeType`, and `alt`. Results are cached in-memory and invalidated when the drawer re-opens or content changes.
4. **Hydrates** the value tree (upload IDs → full docs) and walks it to emit `ContentNode[]`:
   - Lexical richText → `{ type: "html", html: "…" }` via `@payloadcms/richtext-lexical/html`
   - `{ url, mimeType: "image/*", alt? }` → `{ type: "image", … }`
   - `{ url, label | text | title }` → `{ type: "link", … }`
   - Strings → `{ type: "paragraph", … }`
   - Structural keys (`id`, `blockType`, `blockName`, `_template`, `order`) are skipped
5. **Serializes** the Intermediate Representation to an HTML string that is fed to the Yoast engine.

Image checks (alt text, keyphrase in alt, image count) work against the real, resolved media — not raw relationship IDs.

### Custom extractor (`ContentExtractor`)

```ts
type ContentExtractor = (
  values: Record<string, unknown>,
) => ContentNode[] | Promise<ContentNode[]>;
```

Supply a custom extractor when the built-in walker cannot reconstruct your content shape (e.g. a complex block schema with a specific heading hierarchy). The extractor:

- Receives **hydrated, unflattened** form values — upload IDs have already been resolved to full media objects before your function is called.
- Returns `ContentNode[]` (not an HTML string).
- Runs **entirely in the browser** on the live, unsaved form state.

Use the `/content` helpers to build the Intermediate Representation:

```ts
// src/seo/extract-page-content.ts
import {
  heading,
  paragraph,
  image,
  link,
  richText,
} from "@focus-reactive/payload-plugin-seo/content";
import type { ContentNode } from "@focus-reactive/payload-plugin-seo/content";

export default function extractPageContent(
  values: Record<string, unknown>,
): ContentNode[] {
  const blocks = (values as { blocks?: unknown[] }).blocks ?? [];
  return blocks.flatMap((block) => {
    const b = block as Record<string, unknown>;
    switch (b.blockType) {
      case "hero":
        return [
          heading(2, b.title as string),
          paragraph(b.subtitle as string),
          image(
            (b.image as { url?: string; alt?: string } | null)?.url,
            (b.image as { url?: string; alt?: string } | null)?.alt,
          ),
          link(b.ctaUrl as string, b.ctaLabel as string),
        ].filter((n): n is ContentNode => n !== null);
      case "richText":
        return [richText(b.content)].filter(
          (n): n is ContentNode => n !== null,
        );
      default:
        return [];
    }
  });
}
```

### The registry: why it exists and how to use it

Payload 3.84 has no client-side import map — `admin.dependencies` resolves path strings to functions server-side only, and a resolved function cannot cross the server→client boundary as a prop. Because the Yoast analysis runs live in the browser, `extractContentPath` cannot be resolved by Payload machinery on the client.

The plugin bridges this with a `globalThis`-backed registry. `extractContentPath` in config is the **lookup key**; the consuming app registers the actual function under the same key in an admin-mounted client module. The registry uses `globalThis` (not a bare module-level `Map`) so the key and function resolve to the same instance across separate bundle chunks.

**Step 1 — Set `extractContentPath` in the plugin config (the lookup key):**

```ts
// payload.config.ts (or your plugins file)
import { seoPlugin } from "@focus-reactive/payload-plugin-seo";

seoPlugin({
  collections: [
    {
      slug: "page",
      fields: {
        seoTitle: "meta.title",
        metaDescription: "meta.description",
        slug: "slug",
        content: "blocks",
      },
      extractContentPath: "@/collections/Page/extractPageContent#default",
    },
  ],
});
```

**Step 2 — Create a client registrar component:**

```tsx
// src/providers/SeoExtractorRegistrar.tsx
"use client";

import { registerContentExtractors } from "@focus-reactive/payload-plugin-seo/content";
import type { ReactNode } from "react";

import extractPageContent from "@/collections/Page/extractPageContent";

// registerContentExtractors runs once when this module loads in the admin bundle.
// The key must exactly match the extractContentPath string in your plugin config.
registerContentExtractors({
  "@/collections/Page/extractPageContent#default": extractPageContent,
});

export function SeoExtractorRegistrar({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default SeoExtractorRegistrar;
```

**Step 3 — Mount the registrar as an admin provider:**

```ts
// payload.config.ts
export default buildConfig({
  admin: {
    components: {
      providers: ["/providers/SeoExtractorRegistrar"],
    },
  },
  // ...
});
```

If the configured `extractContentPath` is set but the function is not registered (e.g. the provider is missing), the plugin logs a one-time console warning and falls back to the built-in document walker.

### Limitation: `reference`-type action links

Only actions with a literal `url` string become `link` nodes in the Intermediate Representation. Internal relationship references (Payload `relationship` fields pointing to a page or post) cannot be resolved to a URL client-side — only upload media is hydrated before the extractor runs. Omit `reference`-type actions from your extractor or return nothing for them.

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

| Import path                                               | Exports                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-seo`                      | `seoPlugin`, and types `SeoPluginConfig`, `SeoCollectionConfig`, `SeoFieldPaths`, `SeoSiteConfig`, `ContentExtractor`, `ContentSelection`                                                                                 |
| `@focus-reactive/payload-plugin-seo/content`              | Builder helpers `heading`, `paragraph`, `link`, `image`, `video`, `richText`, `html`; `registerContentExtractors`, `resolveContentExtractor`; types `ContentNode`, `HeadingLevel`, `ContentExtractor`, `ContentSelection` |
| `@focus-reactive/payload-plugin-seo/admin.css`            | Compiled admin styles for the drawer & button                                                                                                                                                                             |
| `@focus-reactive/payload-plugin-seo/components/SeoButton` | `SeoButton` — the toolbar button component (wired automatically by the plugin via the importMap; you normally never import this directly)                                                                                 |

---

## License

MIT © FocusReactive
