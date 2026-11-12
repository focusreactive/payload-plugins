# @focus-reactive/payload-plugin-seo

Live SEO analysis for [Payload CMS](https://payloadcms.com/) v3 + Next.js, powered by [Yoast](https://github.com/Yoast/wordpress-seo). Adds a real-time SEO drawer to the document editor — keyphrase optimization, on-page checks, readability, inclusive language, content vitals, and a Google SERP preview — without adding a single field to your documents.

The plugin injects a button into the editor toolbar of each configured collection. Clicking it opens a drawer that reads the current (unsaved) form values, derives the title, meta description, and slug from dot-path config, runs **your** registered content extractor to build the body content, and runs the Yoast analysis engine **entirely in the browser**. By default nothing is persisted — there are zero new collections, globals, or fields. The opt-in [keyphrase index](#keyphrase-index) adds one hidden collection.

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload + Next.js project.

```
I want to add live SEO analysis to my Payload CMS v3 + Next.js project using @focus-reactive/payload-plugin-seo.

## How it works

By default the plugin adds NO database fields, collections, or globals. It injects a button into the
document editor toolbar (admin.components.edit.beforeDocumentControls) of each configured
collection. The button opens a drawer that:
- Reads the live (unsaved) form values for the document
- Derives title, meta description, and slug from dot-path config
- Runs YOUR registered content extractor to build the body content. Content extraction is
  app-owned — there is no built-in walker. The extractor receives the raw form values plus a
  toolkit ({ resolveDocs, helpers }); it fetches any referenced/upload docs it needs via
  resolveDocs and returns a ContentNode[] the plugin serializes to HTML.
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
      },
      // REQUIRED: lookup key for a content extractor you register (see Step 4).
      extractContentPath: '@/seo/extractPageContent#default',
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

## Step 4 — Write and register a content extractor (REQUIRED)

Content extraction is entirely yours — there is no built-in walker, and extractContentPath is
required. Write an extractor and register it under the same key, from an admin-mounted client
module:

// src/seo/extractPageContent.ts
import type { ContentExtractor } from '@focus-reactive/payload-plugin-seo/content'
const extractPageContent: ContentExtractor = async (values, ctx, { resolveDocs, helpers }) => {
  // 1. collect ids from the RAW values (relationship/upload fields are ids)
  // 2. const docs = await resolveDocs([{ collection: 'media', ids, select: ['url','alt'] }])
  // 3. build the IR with helpers
  return helpers.compact([helpers.heading(1, values.title as string) /* … */])
}
export default extractPageContent

// src/providers/SeoExtractorRegistrar.tsx   ("use client")
import { registerContentExtractors } from '@focus-reactive/payload-plugin-seo/content'
import extractPageContent from '@/seo/extractPageContent'
registerContentExtractors({ '@/seo/extractPageContent#default': extractPageContent })
// export a component that renders {children} and mount it via admin.components.providers

## Important notes

- The plugin reads UNSAVED form values, so analysis updates live as you type (debounced ~1s).
- Content extraction is done by YOUR registered extractor; extractContentPath is required and
  there is no built-in fallback. The extractor receives raw form values, a ctx
  ({ locale, apiRoute }), and a toolkit ({ resolveDocs, helpers }), and returns ContentNode[].
- relationship/upload fields arrive as ids; use toolkit.resolveDocs(queries) to fetch only the
  docs/fields you need (one parallel request per collection), then read them with store.get().
- Non-English analysis requires the locale code in `supportedLocales`; the matching Yoast
  language pack is dynamically imported on demand.
- No GA4, no API keys, no server calls except the resolveDocs reads against your own Payload API.
- Optional: `keyphraseIndex: true` stores keyphrases in a hidden `seo-keyphrases` collection,
  warns when a keyphrase is already used elsewhere, and adds an Internal links tab. It adds a
  collection, so SQL adapters need a migration (payload migrate:create). Add a per-collection
  `resolveUrl: ({ doc, locale, req }) => string | null` to show public URLs in link suggestions.
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
        ├─ read live form values (title, description, slug, keyphrase)
        ├─ run your registered extractor(values, ctx, toolkit)
        │     └─ toolkit.resolveDocs(): parallel, projected /api/{collection} fetches
        ├─ extractor returns ContentNode[] → plugin serializes to HTML
        ▼
   Yoast engine (in browser): Paper + EnglishResearcher + SeoAssessor
        │
        ▼
   Tabs: Keyphrase · On-page SEO · Readability · Inclusive · Content vitals · SERP preview
```

The analysis runs on a ~1 second debounce as form values change. **No document data is written** — the drawer is a read-only overlay on top of the editor's current state. Keyphrases are kept in the browser, or on the server with [`keyphraseIndex`](#keyphrase-index).

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
          },
          // Required: register a matching extractor (see "Content Extraction").
          extractContentPath: "@/seo/extractPageContent#default",
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

### Step 4 — Write and register a content extractor

Required — see [Content Extraction](#content-extraction).

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
  /** Override or add UI strings per admin language (see "Admin language"). */
  translations?: Translations;
  /** Store keyphrases on the server and enable the "already used on" notice and the
   *  Internal links tab. Adds the `seo-keyphrases` collection. Default: false */
  keyphraseIndex?: boolean;
}
```

### SeoCollectionConfig

```ts
interface SeoCollectionConfig {
  /** Collection slug to attach the drawer to. */
  slug: string;
  /** Dot-paths telling the plugin which fields hold the title / meta description / slug. */
  fields?: SeoFieldPaths;
  /**
   * REQUIRED. Lookup key for a registered ContentExtractor — the only content path;
   * there is no built-in walker. Set it to the same string you pass as the key in
   * registerContentExtractors(). Convention: the module path of the extractor file,
   * e.g. "@/collections/Page/extractPageContent#default". The extractor runs in the
   * browser on the raw form values and returns ContentNode[]. See "Content Extraction".
   *
   * A collection whose extractContentPath is missing/empty is dropped at plugin init
   * (with a warning); if no collection has a valid extractContentPath the plugin no-ops.
   * If the key is set but not registered at runtime, content analysis for that collection
   * is empty (a one-time console error is logged) — there is no built-in fallback.
   */
  extractContentPath: string;
  /**
   * Server-only. Public URL of a document, used by link suggestions when
   * `keyphraseIndex` is on. Return null when the document has no public URL.
   */
  resolveUrl?: (args: { doc: Record<string, unknown>; locale: string; req: PayloadRequest }) =>
    string | null | Promise<string | null>;
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
}
```

Dot-paths support nesting, e.g. `"meta.description"` or `"content.body"`. Body content is **not** configured here — it is produced by your registered extractor (see below).

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

Content extraction is **app-owned**: you register one `ContentExtractor` per collection. The plugin makes no assumptions about your document schema, relationships, link types, or URL construction — it hands your extractor the raw values plus a small, generic toolkit, and serializes whatever `ContentNode[]` you return.

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

Serialization to HTML (for the Yoast engine) happens entirely inside the plugin. Extractors produce `ContentNode[]`; they never construct HTML strings directly.

### Builder helpers

The `/content` subpath exports pure builder functions. Each helper returns `null` for empty or missing input, and `compact` drops the nulls — so you can build sparse arrays and clean them in one pass. The same helpers are also handed to your extractor as `toolkit.helpers`, so you can use either the imports or the injected object.

```ts
import {
  heading, // heading(level: 1|2|3|4|5|6, text?: string | null): ContentNode | null
  paragraph, // paragraph(text?: string | null): ContentNode | null
  link, // link(href?: string | null, text?: string | null): ContentNode | null
  image, // image(src?: string | null, alt?: string | null): ContentNode | null
  video, // video(src?: string | null, poster?: string | null): ContentNode | null
  richText, // richText(lexicalValue: unknown): ContentNode | null  (lexical → HTML; null when empty)
  html, // html(raw?: string | null): ContentNode | null
  compact, // compact(nodes: (ContentNode | null | undefined)[]): ContentNode[]
} from "@focus-reactive/payload-plugin-seo/content";
import type {
  ContentNode,
  HeadingLevel,
} from "@focus-reactive/payload-plugin-seo/content";
```

### The extractor contract

```ts
type ContentExtractor = (
  values: Record<string, unknown>, // RAW form values; relationship/upload fields are ids
  ctx: ExtractContext, // { locale?: string; apiRoute?: string }
  toolkit: ExtractToolkit, // { resolveDocs, helpers }
) => ContentNode[] | Promise<ContentNode[]>;

interface ExtractToolkit {
  resolveDocs: (queries: DocQuery[]) => Promise<DocStore>;
  helpers: ContentHelpers; // heading, paragraph, link, image, video, richText, html, compact
}

interface DocQuery {
  collection: string;
  ids: (string | number)[];
  select?: string[]; // field projection → ?select[field]=true
  depth?: number; // relationship population → ?depth=N (default 0)
}

interface DocStore {
  get(collection: string, id: string | number): Record<string, unknown> | undefined;
}
```

Your extractor:

- Receives the **raw**, unsaved form values. Relationship and upload fields are **ids** (or id arrays / `{ relationTo, value }`), **not** populated objects — the plugin does no hydration.
- Owns ref collection and any link/URL building. The plugin makes no assumptions about your link types (internal references, custom URLs, etc.) — you decide what to fetch and how to turn it into a node.
- Uses `toolkit.resolveDocs(queries)` to fetch referenced/upload documents. You pass one query per collection with the `ids` you collected and an optional `select` projection (fetch only the fields you need) and `depth`. **All queries run in parallel.** Read results with `store.get(collection, id)`.
- Returns `ContentNode[]` (built with the helpers); the plugin serializes it.

```ts
// src/collections/Page/extractPageContent.ts
import { heading, image, paragraph, richText } from "@focus-reactive/payload-plugin-seo/content";
import type {
  ContentExtractor,
  DocStore,
} from "@focus-reactive/payload-plugin-seo/content";

const extractPageContent: ContentExtractor = async (values, _ctx, { resolveDocs, helpers }) => {
  const blocks = (values as { blocks?: Record<string, unknown>[] }).blocks ?? [];

  // 1. Collect the ids you care about from the RAW values (you know your schema).
  const mediaIds = blocks.flatMap((b) => (typeof b.image === "number" ? [b.image] : []));

  // 2. Fetch them — one parallel request per collection, projected to only the fields you need.
  const docs: DocStore = await resolveDocs([
    { collection: "media", ids: mediaIds, select: ["url", "alt", "mimeType"] },
  ]);

  // 3. Build the Intermediate Representation.
  return helpers.compact(
    blocks.flatMap((b) => {
      const media = typeof b.image === "number" ? docs.get("media", b.image) : undefined;
      return [
        heading(2, b.title as string),
        paragraph(b.subtitle as string),
        image((media as { url?: string })?.url, (media as { alt?: string })?.alt),
        richText(b.content),
      ];
    }),
  );
};

export default extractPageContent;
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

If the configured `extractContentPath` is set but the function is not registered (e.g. the provider is missing), the plugin logs a one-time console error and content analysis for that collection is empty — there is no built-in fallback.

### Limitation: links and uploads embedded inside richText

`helpers.richText(value)` serializes the lexical tree to HTML **as-is**. Internal-link nodes and upload nodes embedded inside richText *body content* are **not** resolved by the plugin — their `href`s / `src`s are left as the lexical tree provides them. This keeps the plugin fully schema-agnostic. If you need those resolved, walk the lexical tree yourself inside your extractor (its structure is standard Payload lexical), collect the referenced ids, fetch them with `resolveDocs`, and rewrite the nodes before building the IR.

---

## Generated SEO fields

`seoTextField` is an optional utility that adds AI-assisted generation directly inside
a Payload text field. Import it from `@focus-reactive/payload-plugin-seo/fields` and
drop it anywhere in a collection's `fields` array — it returns a standard Payload `text`
field with an enhanced field component that shows a length meter, a status pill, and
(optionally) a **Generate** button.

### Usage

```ts
// payload.config.ts (or a separate collection file)
import { seoPlugin } from "@focus-reactive/payload-plugin-seo";
import { seoTextField } from "@focus-reactive/payload-plugin-seo/fields";

const MyCollection = {
  slug: "pages",
  fields: [
    {
      name: "meta",
      type: "group",
      fields: [
        seoTextField({
          name: "title",
          kind: "title",
          label: "Meta Title",
          localized: true,
          showButton: true,         // Mode 2: on-demand Generate button
          generateOnPublish: true,  // Mode 1: auto-fill on publish when empty
        }),
        seoTextField({
          name: "description",
          kind: "description",
          label: "Meta Description",
          localized: true,
          showButton: true,
          generateOnPublish: true,
        }),
      ],
    },
  ],
};
```

Both modes can be active on the same field at the same time.

### `seoTextField` options

```ts
interface SeoTextFieldOptions {
  /** Field name — passed straight to the underlying Payload text field. */
  name: string;
  /**
   * "title" or "description".
   * Drives the generation prompt, the default target range, the measurement unit, and the
   * rendered input/field type:
   *   title       → single-line `text` field; pixel-width measurement (Yoast heuristic)
   *   description → multi-line `textarea` field; character-count measurement
   */
  kind: "title" | "description";
  /** Human-readable label shown in the admin UI. */
  label?: string;
  /** Mark the field as required. */
  required?: boolean;
  /** Enable per-locale storage. */
  localized?: boolean;
  /** Standard Payload field admin overrides. */
  admin?: Record<string, unknown>;
  /**
   * Mode 2 — render a black-shade Generate button in the field's label row.
   * Clicking it calls the generation endpoint using the current (unsaved) page content.
   * Works on new/unsaved documents.
   * Default: false.
   */
  showButton?: boolean;
  /**
   * Mode 1 — on publish, auto-fill the field from page content ONLY when it is empty.
   * A manual value is never overwritten.
   * Shows a small "generated on publish" tooltip icon next to the label.
   * Default: false.
   */
  generateOnPublish?: boolean;
  /**
   * Override the target length window.
   * Defaults: title → 400–600 px; description → 120–156 chars.
   */
  range?: { min?: number; max?: number };
}
```

The field renders identically to a native Payload text field, with two additions below
the input: a length meter (pixels for title, characters for description) and a status
pill showing **Too short**, **Good**, or **Too long** against the configured range.

### Generation endpoint and OpenAI config

When at least one `seoTextField` has `showButton` or `generateOnPublish` enabled, the
plugin registers a server endpoint at `POST {apiRoute}/seo/generate`. This endpoint
reads `OPENAI_API_KEY` from the server environment and calls OpenAI to produce the
field value.

Configure generation via the plugin's `generation` option:

```ts
seoPlugin({
  collections: [/* ... */],
  generation: {
    /** OpenAI model. Default: "gpt-4o-mini". */
    model: "gpt-4o-mini",
    /**
     * API key. Optional — falls back to process.env.OPENAI_API_KEY automatically.
     * Useful when the key lives in a non-standard env variable or is resolved at
     * config time.
     */
    apiKey: process.env.OPENAI_API_KEY,
    /**
     * Maximum characters of page content sent to the model.
     * Default: 6000.
     */
    maxContentChars: 6000,
    /** Override the system prompt used for title generation. */
    titlePrompt: "Write an SEO meta title…",
    /** Override the system prompt used for description generation. */
    descriptionPrompt: "Write an SEO meta description…",
  },
})
```

If no API key resolves (neither `generation.apiKey` nor `OPENAI_API_KEY` is set),
generation is **disabled gracefully**: the Generate button is hidden in the UI and
the on-publish hook is a no-op — no errors are thrown.

Generation is locale-aware: the active document locale is forwarded to the endpoint
and included in the prompt.

### Extractors for generation

**Mode 2 (button)** reuses the `extractContentPath` extractor already configured for
the analysis drawer. No additional registration is needed — the button calls the same
client-side extractor.

**Mode 1 (on-publish)** runs server-side and requires a `serverExtractContent` function
on the collection's plugin config. It follows the same `ContentExtractor` contract, but
receives a Local-API-backed `resolveDocs` and the document being saved:

```ts
// src/collections/Page/extractPageContent.server.ts
import type { ContentExtractor } from "@focus-reactive/payload-plugin-seo/content";

export const serverExtractPageContent: ContentExtractor = async (
  values,
  _ctx,
  { resolveDocs, helpers },
) => {
  // values = the document being saved (same shape as the client-side extractor)
  // resolveDocs = Local API-backed; works the same way as the client version
  return helpers.compact([
    helpers.heading(1, values.title as string),
    // … rest of your extraction logic
  ]);
};
```

```ts
// payload.config.ts
import { serverExtractPageContent } from "@/collections/Page/extractPageContent.server";

seoPlugin({
  collections: [
    {
      slug: "page",
      fields: { seoTitle: "meta.title", metaDescription: "meta.description", slug: "slug" },
      extractContentPath: "@/collections/Page/extractPageContent#default", // client (button + drawer)
      serverExtractContent: serverExtractPageContent,                       // server (on-publish)
    },
  ],
  generation: { /* ... */ },
});
```

Because the extractor only reads ids and calls the injected `resolveDocs`, the same
function body can usually serve both client and server without modification — just
export it twice (or re-export from a shared file).

> **Note:** The plugin auto-registers the `SeoClientConfigProvider` admin provider
> internally. You do not need to add it to `admin.components.providers` manually.

---

## The Analysis Drawer

The drawer presents six tabs, all derived from a single in-browser Yoast analysis pass (a `Paper` analyzed by `SeoAssessor` with the language-appropriate `Researcher`):

| Tab                       | What it checks                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Keyphrase**             | Two-pane keyphrase workspace: a **focus keyphrase** — usage in title, slug, meta description, first paragraph, density, image alt, synonyms — plus up to **four related keyphrases** (five total), each with its own synonyms and independent Yoast checks. Only the focus keyphrase's result feeds the overall score; related keyphrases are scored side-by-side for reference and never affect it. Enter a keyphrase to unlock these checks. |
| **On-page SEO**           | Title width, meta description presence/length, internal & outbound links, heading structure.                                                       |
| **Readability**           | Sentence/paragraph length, transition words, passive voice, consecutive sentences.                                                                 |
| **Inclusive**             | Flags potentially exclusionary or non-inclusive language.                                                                                          |
| **Content vitals**        | Word count, sentence/paragraph counts, image & video counts, reading time, prominent words.                                                        |
| **Search result preview** | Live Google SERP preview (desktop + mobile) with keyphrase highlighting, built on `@yoast/search-metadata-previews`.                               |
| **Internal links**        | Other documents whose keyphrases appear in this text but are not linked yet. Only with [`keyphraseIndex`](#keyphrase-index).                       |

**Without a keyphrase:** the drawer still runs and the On-page, Readability, Inclusive, Content vitals, and SERP tabs all populate. Only the keyphrase-specific assessments wait until you type a focus keyphrase and analysis runs.

### Keyphrase tab

The **Keyphrase** tab is a master–detail workspace: a rail lists all configured keyphrases (the focus keyphrase first, then any related ones), and selecting an entry shows its detail pane — the keyphrase text, its synonyms, and its own Yoast result.

- **Focus keyphrase** — the first entry. It runs the full `SeoAssessor` (the same checks listed above), and its result is the only one that feeds the drawer's overall score badge.
- **Related keyphrases** — up to four more entries (five total, a fixed cap with no config option). Each runs Yoast's `RelatedKeywordAssessor`, a smaller check set built for secondary keyphrases (title, meta description, first paragraph, image alt, keyphrase density, and prominent-word coverage). Related results are shown for reference only — they never affect the overall score.
- **Synonyms** — each keyphrase (focus or related) can have its own synonym list; synonyms are folded into that keyphrase's own analysis pass, the same way they would be for a single Yoast focus keyphrase.
- **SERP highlighting** — the search-result preview bolds only the focus keyphrase and its synonyms; related keyphrases are not highlighted there.

**Persistence:** by default keyphrases are **not stored in the database** — there are no new fields, collections, or globals. The full list (text + synonyms per entry) is kept in the browser's `localStorage`, keyed per collection + document + locale, and is pruned of empty entries on save. Switching documents or locales loads (or starts) a separate list; clearing browser storage resets it. With [`keyphraseIndex`](#keyphrase-index) the list is stored on the server instead.

---

## Keyphrase index

Set `keyphraseIndex: true` to store keyphrases on the server, so every editor sees the same set:

```ts
seoPlugin({
  collections: [/* … */],
  keyphraseIndex: true,
});
```

- Keyphrases and synonyms are saved per document and locale in a hidden `seo-keyphrases` collection (`docCollection`, `docId`, `locale`, `keyphrases`, `intents`, unique on `docCollection` + `docId` + `locale`). Up to 5 keyphrases per document, 10 synonyms each, 100 characters per entry.
- With the index on, keyphrases are no longer kept in browser storage. If the server has never stored keyphrases for a document and locale, the ones saved in the browser before the index was enabled are uploaded the first time the drawer is opened. The upload never overwrites a row another tab or editor created in the meantime, and the browser copy is removed only after the server accepted it.
- Editors who can read a document but not update it see its keyphrases and can edit them for analysis, but their edits stay in memory and are not saved.
- Removing every keyphrase keeps an empty row, so an old browser copy is never uploaded over it.
- A pending edit is sent when the page is hidden or closed, so navigating away does not lose it.
- Rows are deleted when their document is deleted.
- The option adds a collection. On SQL adapters (Postgres, SQLite) run `payload migrate:create` after enabling it and apply the migration.

### Endpoints and access

The plugin registers four endpoints under your API route. `locale` is required when localization is enabled and ignored otherwise.

- `GET /seo/keyphrases?collection=&docId=&locale=` returns `{ keyphrases, indexed, canUpdate }`, where `indexed` says whether the server has a row for the document and locale and `canUpdate` whether the user may change it.
- `PUT /seo/keyphrases` with body `{ collection, docId, locale, keyphrases: [{ text, synonyms }], ifAbsent?: boolean }` replaces the keyphrases and returns `{ keyphrases }`. With `ifAbsent: true` it only creates a missing row and answers `409` with the stored keyphrases when one exists.
- `GET /seo/keyphrase-usage?collection=&docId=&locale=&phrase=` returns `{ docs: [{ collection, id, title }] }`, the other documents that use the same keyphrase.
- `POST /seo/link-suggestions` with body `{ collection, docId, locale, text, linkedHrefs?: string[], linkedDocs?: [{ collection, docId }] }` returns `{ suggestions }`.

The `seo-keyphrases` collection itself is closed: every operation is denied in its access control, it is hidden from the admin and not exposed over GraphQL. Only these endpoints read or write it.

- Every request needs a logged-in user (otherwise `401`) from the admin user collection `admin.user` (otherwise `403`).
- The user must be able to read the document the request is about, otherwise `404`.
- `PUT /seo/keyphrases` also needs update access to that document, evaluated with the collection's `access.update` including query constraints, otherwise `403`. The access function is called with the document `id` but without `data`, and an error thrown while checking counts as no access.
- Every document returned is loaded with the user's read access, so editors never see titles or URLs they could not open themselves.

### "Already used on" notice

The Keyphrase tab shows **"This keyphrase is already used on:"** with links to the edit view of other documents that have the same keyphrase in the same locale. Word order, case and accents are ignored (`CMS Payload` = `payload cms`, `café` = `cafe`). Synonyms are not compared.

### Internal links tab

The drawer gets an **Internal links** tab. **Find opportunities** lists up to 10 other documents whose keyphrases or synonyms appear in this document's text and are not linked from it yet, with the matched phrase, the number of matches, a snippet with the matched text highlighted and the target link to copy.

Give each collection a `resolveUrl` so suggestions show public URLs and targets already linked by URL are skipped. Without it, suggestions only link to the admin edit view.

```ts
import type { ResolveUrl } from "@focus-reactive/payload-plugin-seo";

const resolvePostUrl: ResolveUrl = ({ doc, locale }) =>
  typeof doc.slug === "string" ? `/${locale}/blog/${doc.slug}` : null;

seoPlugin({
  keyphraseIndex: true,
  collections: [
    {
      slug: "posts",
      extractContentPath: "@/collections/Posts/extractPostContent#default",
      resolveUrl: resolvePostUrl,
    },
  ],
});
```

`resolveUrl` runs on the server with the target document (depth 0) in the requested locale. Relative and absolute URLs both work. A thrown error is logged and treated as `null`.

Matching rules:

- Whole words only: `web` does not match `websites`.
- Case and diacritics are ignored: `café` matches `cafe`.
- A hyphen counts as a space: `e-commerce` matches `e commerce`.
- Scripts written without spaces between words (Chinese, Japanese, Thai) are not matched.
- Only documents that have keyphrases in the same locale can be suggested. In collections with drafts enabled only published documents are suggested.
- A target is skipped when the text already links to it, either as a rich text internal link or by an `href` whose path equals its `resolveUrl` result.
- Rich text internal links are read from the Lexical `LinkFeature` shape (`linkType: "internal"`, `doc: { relationTo, value }`) anywhere in the form data. Other link fields, such as custom link groups or relationship fields, are only detected through the `href` they render into the content.
- An `href` counts only when it is relative, or when its origin equals the origin of `serverURL`, of the plugin's `site.baseUrl` or of an absolute `resolveUrl` result. Links to other sites are ignored, even when their path matches.
- Paths are compared literally: `/en/alpha` and `/alpha` are different. If your site serves the default locale both with and without a prefix, return from `resolveUrl` the form your content links use.
- Each request reads every index row of the locale (`docCollection`, `docId`, `keyphrases` only) and matches them in memory.
- Limits: the text sent for matching is capped at 100,000 characters, at most 500 `href`s of up to 2,048 characters each and at most 500 rich text internal links are compared.

---

## Localization

`supportedLocales` lists which locale codes the drawer may load Yoast language packs for. English is built in; other languages are dynamically imported on demand the first time the document is edited in that locale:

```ts
seoPlugin({
  collections: [
    {
      slug: "pages",
      fields: { slug: "slug" },
      extractContentPath: "@/seo/extractPageContent#default",
    },
  ],
  supportedLocales: ["en", "de", "fr", "es"],
});
```

The active locale is taken from the admin and normalized to Yoast's `xx_XX` form (e.g. `en` → `en_EN`). The locale is passed to your extractor as `ctx.locale` and to `resolveDocs` (so projected fetches are locale-correct). A locale not listed in `supportedLocales` falls back to English processing.

### Admin language

The drawer and the generated fields speak the admin's language (Payload's `i18n`, the user's language switch), independently of the content locale above. English and Czech ship with the plugin; any other admin language falls back to English string by string.

Payload only offers the admin languages your config enables, so add Czech to `i18n.supportedLanguages` to get the Czech UI:

```ts
import { cs } from "@payloadcms/translations/languages/cs";
import { en } from "@payloadcms/translations/languages/en";

export default buildConfig({
  i18n: { supportedLanguages: { en, cs } },
  // ...
});
```

The strings are registered as Payload custom translations under the `seo` namespace, so they can be overridden — or a whole language added — with `translations`. Keys are the ones in [`src/translations/messages/en.ts`](./src/translations/messages/en.ts):

```ts
seoPlugin({
  // ...
  translations: {
    de: {
      title: "SEO-Analyse",
      "tab.keyphrase": "Fokus-Keyphrase",
      "viz.show.link_one": "{{count}} Link anzeigen",
      "viz.show.link_other": "{{count}} Links anzeigen",
    },
  },
});
```

`{{name}}` placeholders are interpolated. Plurals are separate keys suffixed `_zero`, `_one`, `_two`, `_few`, `_many` or `_other`, chosen with `Intl.PluralRules` for the admin language; `_other` is required, the rest only where the language has that form (Czech uses `_one`, `_few` and `_other`). Keys are type-checked against the English set (the `Translations` type is exported). The `seo:` prefix and the colon-separated tab keys of earlier versions (`"seo:tab:keyphrase"`) are still accepted. Strings from this option take precedence over `i18n.translations.<language>.seo` in your Payload config.

---

## Exports Reference

| Import path                                                          | Exports                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-seo`                                 | `seoPlugin`, `seoTextField`; types `SeoPluginConfig`, `SeoCollectionConfig`, `SeoFieldPaths`, `SeoSiteConfig`, `ContentExtractor`, `SeoGenerationConfig`, `ResolveUrl`, `ResolveUrlArgs`, `Translations`, `MessageKey` |
| `@focus-reactive/payload-plugin-seo/content`                         | Builder helpers `heading`, `paragraph`, `link`, `image`, `video`, `richText`, `html`, `compact`; `registerContentExtractors`, `resolveContentExtractor`; types `ContentNode`, `HeadingLevel`, `ContentExtractor`, `ExtractContext`, `ExtractToolkit`, `DocQuery`, `DocStore`, `ContentHelpers` |
| `@focus-reactive/payload-plugin-seo/fields`                          | `seoTextField`; type `SeoTextFieldOptions`                                                                                                                                                                                                           |
| `@focus-reactive/payload-plugin-seo/admin.css`                       | Compiled admin styles for the drawer & button                                                                                                                                                                                                       |
| `@focus-reactive/payload-plugin-seo/components/SeoButton`            | `SeoButton` — the toolbar button component (wired automatically by the plugin via the importMap; you normally never import this directly)                                                                                                            |
| `@focus-reactive/payload-plugin-seo/components/SeoField`             | `SeoField` — the enhanced text field component (length meter + status pill + Generate button); wired automatically via `seoTextField`; you normally never import this directly                                                                       |
| `@focus-reactive/payload-plugin-seo/providers/SeoClientConfigProvider` | `SeoClientConfigProvider` — carries the client-side plugin config (generation settings, collection map) into the admin bundle; auto-registered by the plugin — do not add it to `admin.components.providers` manually                              |

---

## License

MIT © FocusReactive
