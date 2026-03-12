# @focus-reactive/payload-plugin-ab

A/B testing plugin for [Payload CMS](https://payloadcms.com/) v3 + Next.js. Create page variants directly inside the Payload admin, assign traffic percentages, and route users at the edge — no extra collections, no manual wiring..

Variants live in the same collection as the original page. The plugin injects the admin UI, hooks, and a variant manifest that Next.js middleware reads to route traffic without a database round-trip.

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload + Next.js project.

```
I want to add A/B testing to my Payload CMS v3 + Next.js project using @focus-reactive/payload-plugin-ab.

## How it works

Variants are regular documents in the same collection as the original page, distinguished by an
injected `_abVariantOf` relationship field. The plugin auto-injects:
- A Variants panel (sidebar) on original pages — lists variants, traffic % inputs, "+ Add new" button
- A "Variant of" badge (sidebar) on variant pages — links back to the original
- Hooks that maintain a variant manifest (a path-keyed JSON map) in a storage adapter
- A `POST /api/_ab/duplicate` endpoint that clones a page with slug `original--{hash}`

The manifest is read by Next.js middleware at the edge to rewrite requests to the correct variant.

## Installation

pnpm add @focus-reactive/payload-plugin-ab

## Step 1 — Register the plugin in payload.config.ts

import { abTestingPlugin } from '@focus-reactive/payload-plugin-ab'
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const abAdapter = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
})

// Inside buildConfig({ plugins: [...] })
abTestingPlugin({
  storage: abAdapter,
  collections: {
    // Key = slug of any collection you want to A/B test
    pages: {
      generatePath: ({ doc, locale }) => {
        const slug = doc.slug as string | undefined
        if (!slug) return null
        return locale ? `/${locale}/${slug}` : `/${slug}`
      },
      // generateVariantData is optional — auto-generates:
      // { bucket: variantSlug, rewritePath: generatePath(variantDoc), passPercentage }
    },
  },
})

## Step 2 — Add Next.js middleware

import { createResolveAbRewrite } from '@focus-reactive/payload-plugin-ab/middleware'
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const storage = payloadGlobalAdapter({ serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '' })

const resolveAbRewrite = createResolveAbRewrite({
  storage,
  getBucket: (v) => v.bucket,
  getRewritePath: (v) => v.rewritePath,
  getPassPercentage: (v) => v.passPercentage,
})

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const result = await resolveAbRewrite(request, pathname, pathname, pathname)
  return result ?? NextResponse.next()
}

export const config = { matcher: ['/((?!_next|api|favicon.ico).*)'] }

## Important notes

- generatePath must return a non-null path for variant slugs (e.g. "about--4ji9") since it
  is also used to compute the variant's rewrite path when generateVariantData is omitted.
- Variant documents are hidden from the collection list view automatically.
- The slug field (and tenantField if configured) is read-only on variant documents.
- Percentage validation: the sum of all variant passPercentage values for one page cannot exceed 100.
  A Payload ValidationError is thrown on save if it would.
- For Vercel deployments, swap payloadGlobalAdapter for vercelEdgeAdapter for sub-millisecond
  manifest reads from Vercel Edge Config.
- If the project uses Payload localization, locale-aware manifest entries are written automatically
  — no extra config needed.
```

---

## How It Works

Variants live **inside the same collection as the original page**:

```
pages collection
├── original   slug: "about"       _abVariantOf: null
├── variant A  slug: "about--4ji9" _abVariantOf: <original id>
└── variant B  slug: "about--x2k1" _abVariantOf: <original id>
```

On every save or delete, hooks recompute the **variant manifest** — a plain JSON object keyed by URL path — and write it to the storage adapter. Next.js middleware reads the manifest at the edge to rewrite the request before any rendering happens.

```
Payload Admin  →  afterChange / afterDelete hooks  →  Storage Adapter
                                                              ↓
                                         { "/about": [variantA, variantB] }
                                                              ↓
                                              Next.js Middleware (edge)
                                                              ↓
                                           Route user to original or variant
```

---

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-ab
```

For the Vercel Edge adapter, also install:
```bash
pnpm add @vercel/edge-config
```

**Peer dependencies:** `payload ^3.0.0`. `next ^14 || ^15` and `react ^18 || ^19` are optional, required only for middleware and analytics respectively.

---

## Quick Start

### Step 1 — Register the plugin

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { abTestingPlugin } from '@focus-reactive/payload-plugin-ab'
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const abAdapter = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
})

export default buildConfig({
  plugins: [
    abTestingPlugin({
      storage: abAdapter,
      collections: {
        pages: {
          generatePath: ({ doc, locale }) => {
            const slug = doc.slug as string | undefined
            if (!slug) return null
            return locale ? `/${locale}/${slug}` : `/${slug}`
          },
        },
      },
    }),
  ],
})
```

The plugin injects into every configured collection:
- **Variants panel** (sidebar on original pages) — lists variants with % inputs, add, delete
- **"Variant of"** read-only relationship (sidebar on variant pages)
- `_abVariantOf` and `_abPassPercentage` fields (hidden from editors)
- `admin.baseListFilter` to hide variant documents from the list view
- `beforeChange` / `afterChange` / `afterDelete` hooks

### Step 2 — Wire up middleware

```ts
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createResolveAbRewrite } from '@focus-reactive/payload-plugin-ab/middleware'
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const storage = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? '',
})

const resolveAbRewrite = createResolveAbRewrite({
  storage,
  getBucket: (v) => v.bucket,
  getRewritePath: (v) => v.rewritePath,
  getPassPercentage: (v) => v.passPercentage,
})

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const result = await resolveAbRewrite(request, pathname, pathname, pathname)
  return result ?? NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
```

---

## Configuration Reference

### Plugin Options

```ts
interface AbTestingPluginConfig<TVariantData extends object> {
  storage: StorageAdapter<TVariantData>
  collections: Record<string, CollectionABConfig<TVariantData>>
  enabled?: boolean  // default: true
  debug?: boolean    // show manifest Global in Payload admin. default: false
}
```

### CollectionABConfig

```ts
interface CollectionABConfig<TVariantData = DefaultVariantData> {
  /**
   * Slug field name used to generate variant slugs: `{original}--{hash}`.
   * Default: 'slug'
   */
  slugField?: string

  /**
   * Dot-notation path to the tenant field.
   * Scopes percentage validation per tenant; locks the field read-only on variants.
   */
  tenantField?: string

  /**
   * Returns the URL path used as the manifest key.
   * Return null to skip this document.
   * Called once per locale when localization is enabled.
   *
   * Must also return a valid path for variant slugs (e.g. 'about--4ji9')
   * since it is used to compute rewritePath when generateVariantData is omitted.
   */
  generatePath: (args: {
    doc: Record<string, unknown>
    locale: string | undefined
  }) => string | null

  /**
   * Builds the data stored per variant in the manifest.
   * When omitted, auto-generates: { bucket: variantSlug, rewritePath, passPercentage }
   */
  generateVariantData?: (args: {
    doc: Record<string, unknown>        // parent document
    variantDoc: Record<string, unknown> // variant document
    locale: string | undefined
  }) => TVariantData
}

// Default shape when generateVariantData is omitted:
type DefaultVariantData = {
  bucket: string         // variant's slug, e.g. 'about--4ji9'
  rewritePath: string    // result of generatePath(variantDoc, locale)
  passPercentage: number // _abPassPercentage field value
}
```

### StorageAdapter

```ts
interface StorageAdapter<TVariantData extends object> {
  write(path: string, variants: TVariantData[], payload: Payload): Promise<void>
  read(path: string): Promise<TVariantData[] | null>  // must be edge-compatible
  clear(path: string, payload: Payload): Promise<void>
  createGlobal?(debug: boolean): GlobalConfig  // optional, used by payloadGlobalAdapter
}
```

Implement this interface to use any backend (Redis, Upstash, Vercel KV, etc.).

---

## Storage Adapters

### payloadGlobalAdapter

Stores the manifest in a Payload Global as a JSON field. Middleware fetches it via the Payload REST API.

```ts
import { payloadGlobalAdapter } from '@focus-reactive/payload-plugin-ab/adapters/payload-global'

const storage = payloadGlobalAdapter({
  serverURL: 'https://cms.example.com', // required for middleware reads
  globalSlug: '_abManifest',            // default
  apiRoute: '/api',                     // default
})
```

The Global is hidden from the admin by default. Set `debug: true` in plugin options to expose it under the **System** group.

### vercelEdgeAdapter

Stores the manifest in Vercel Edge Config for sub-millisecond reads at the edge.

```ts
import { vercelEdgeAdapter } from '@focus-reactive/payload-plugin-ab/adapters/vercel-edge'

const storage = vercelEdgeAdapter({
  configID: process.env.EDGE_CONFIG_ID!,
  configURL: process.env.EDGE_CONFIG!,
  vercelRestAPIAccessToken: process.env.VERCEL_REST_API_ACCESS_TOKEN!,
  teamID: process.env.VERCEL_TEAM_ID,  // optional
  manifestKey: 'ab-testing',           // default
})
```

**Required env vars:** `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_REST_API_ACCESS_TOKEN`.
Create an Edge Config store in the Vercel dashboard and install `@vercel/edge-config`.

---

## Middleware

### createResolveAbRewrite

```ts
import { createResolveAbRewrite } from '@focus-reactive/payload-plugin-ab/middleware'

const resolveAbRewrite = createResolveAbRewrite({
  storage,                                       // same adapter as the plugin
  getBucket: (v) => v.bucket,                   // extract bucket key
  getRewritePath: (v) => v.rewritePath,         // extract internal rewrite URL
  getPassPercentage: (v) => v.passPercentage,   // enables weighted routing
})

// In middleware:
const result = await resolveAbRewrite(
  request,
  pathname,  // visiblePathname — used as the per-path cookie key
  pathname,  // manifestKey — key to look up in the manifest
  pathname,  // originalRewritePath — where to send 'original' bucket users
)
```

The three path arguments let you decouple what the user sees, the manifest key, and the internal rewrite target — useful with locale prefixes:

```ts
const internalPath = `/${locale}${pathname}`

await resolveAbRewrite(request, pathname, internalPath, internalPath)
```

**Routing:** When `getPassPercentage` is provided, each variant receives its percentage of traffic; the remainder goes to the original. The plugin validates on save that the sum never exceeds 100%. When `getPassPercentage` is omitted, all variants and the original share equal probability.

**Sticky sessions:** Bucket assignment is stored in a per-path cookie so returning users always see the same variant.

### Cookie System

| Cookie | Default name | Lifetime | Purpose |
|---|---|---|---|
| Bucket | `payload_ab_bucket_{path}` | Session | Which bucket this user is in |
| Visitor ID | `ab_visitor_id` | 365 days | Persistent visitor identifier for analytics |
| Experiment | `exp_{path}` | 90 days | Bucket name readable client-side by analytics hooks |

Override names by passing a `cookies` config to `createResolveAbRewrite`:

```ts
import type { AbCookieConfig } from '@focus-reactive/payload-plugin-ab/middleware'

// Define once, share between middleware and analytics
export const abCookies: AbCookieConfig = {
  visitorIdCookieName: 'my_visitor_id',
  getExpCookieName: (key) => `ab_exp_${key}`,
}
```

Use `resolveAbCookieNames(config, experimentId)` in Server Components to derive cookie names as plain strings for passing to Client Components:

```ts
import { resolveAbCookieNames } from '@focus-reactive/payload-plugin-ab/middleware'

const { variantCookieName, visitorCookieName } = resolveAbCookieNames(abCookies, '/en/about')
```

---

## Analytics

Pluggable adapter-based system. Install at app root, then use React components and hooks on pages.

### Setup

```tsx
// app/layout.tsx
import { ABAnalyticsProvider } from '@focus-reactive/payload-plugin-ab/analytics/client'
import { googleAnalyticsAdapter } from '@focus-reactive/payload-plugin-ab/analytics/adapters/google-analytics'

const analytics = googleAnalyticsAdapter({
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!,
})

export default function RootLayout({ children }) {
  return <ABAnalyticsProvider adapter={analytics}>{children}</ABAnalyticsProvider>
}
```

### Tracking impressions

Drop `ExperimentTracker` anywhere inside a page — fires one impression per browser session:

```tsx
// app/[locale]/[slug]/page.tsx  (Server Component)
import { ExperimentTracker } from '@focus-reactive/payload-plugin-ab/analytics/client'
import { resolveAbCookieNames } from '@focus-reactive/payload-plugin-ab/middleware'

export default async function Page({ params }) {
  const experimentId = `/${params.locale}/${params.slug}`
  const { variantCookieName, visitorCookieName } = resolveAbCookieNames(undefined, experimentId)

  return (
    <>
      {/* page content */}
      <ExperimentTracker
        experimentId={experimentId}
        variantCookieName={variantCookieName}
        visitorCookieName={visitorCookieName}
      />
    </>
  )
}
```

### Tracking conversions

```tsx
'use client'
import { useABConversion } from '@focus-reactive/payload-plugin-ab/analytics/client'

export function CTAButton({ experimentId, variantCookieName, visitorCookieName }) {
  const trackConversion = useABConversion({ experimentId, variantCookieName, visitorCookieName })
  return <button onClick={() => trackConversion({ goalId: 'cta_click' })}>Get Started</button>
}
```

### Google Analytics Adapter

```ts
import { googleAnalyticsAdapter } from '@focus-reactive/payload-plugin-ab/analytics/adapters/google-analytics'

const analytics = googleAnalyticsAdapter({
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!,  // required
  apiSecret: process.env.GA4_API_SECRET,       // enables server-side tracking
  propertyId: process.env.GA4_PROPERTY_ID,     // enables getStats()
  getAccessToken: () => auth.getAccessToken(), // enables getStats()
})
```

Events sent: `ab_impression` and `ab_conversion` (names configurable) with `experiment_id`, `variant_bucket`, `visitor_id`, and any extra `metadata`.

Implement the `AnalyticsAdapter` interface to connect any other analytics backend.

---

## Multi-Tenant Support

```ts
abTestingPlugin({
  storage,
  collections: {
    pages: {
      tenantField: 'tenant',  // dot-notation path to the tenant field
      generatePath: ...,
    },
  },
})
```

When set, percentage-sum validation is scoped per tenant, and the tenant field is locked read-only on variant pages.

---

## Localization Support

No extra config needed. When `payload.config.localization` is set, the plugin iterates every locale on each save and writes a separate manifest entry per locale. `locale` is `undefined` when localization is not configured.

```ts
generatePath: ({ doc, locale }) => {
  const slug = doc.slug as string | undefined
  if (!slug) return null
  return locale ? `/${locale}/${slug}` : `/${slug}` // '/en/about', '/fr/about'
}
```

---

## Exports Reference

| Import path | Exports |
|---|---|
| `@focus-reactive/payload-plugin-ab` | `abTestingPlugin`, `AbTestingPluginConfig`, `CollectionABConfig`, `StorageAdapter` |
| `@focus-reactive/payload-plugin-ab/adapters/payload-global` | `payloadGlobalAdapter` |
| `@focus-reactive/payload-plugin-ab/adapters/vercel-edge` | `vercelEdgeAdapter` |
| `@focus-reactive/payload-plugin-ab/middleware` | `createResolveAbRewrite`, `resolveAbCookieNames`, `AbCookieConfig`, `ResolveAbRewriteConfig` |
| `@focus-reactive/payload-plugin-ab/analytics` | Types: `AnalyticsAdapter`, `TrackImpressionArgs`, `TrackConversionArgs`, `ExperimentStats` |
| `@focus-reactive/payload-plugin-ab/analytics/client` | `ABAnalyticsProvider`, `ExperimentTracker`, `useABConversion` |
| `@focus-reactive/payload-plugin-ab/analytics/adapters/google-analytics` | `googleAnalyticsAdapter`, `GoogleAnalyticsAdapterConfig` |
