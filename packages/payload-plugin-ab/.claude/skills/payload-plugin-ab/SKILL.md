---
name: payload-plugin-ab
description: >
  Use this skill for anything involving the payload-plugin-ab Payload CMS plugin.
  Triggers include: installing payload-plugin-ab, configuring its options, asking
  what it does, troubleshooting errors, upgrading versions, setting up A/B testing,
  configuring storage adapters, writing Next.js middleware for variant routing,
  setting up analytics tracking, and answering questions about its API. If the user
  mentions "payload-plugin-ab", "A/B testing plugin", "variant routing", "ab testing",
  "abTestingPlugin", or "variant manifest" in any Payload CMS context, always use this skill.
---

# payload-plugin-ab

> Adds A/B testing to Payload CMS + Next.js: create page variants in the admin UI, route traffic at the edge via Next.js middleware, and track impressions/conversions with Google Analytics.

**Source**: [github.com/focusreactive/payload-plugins](https://github.com/focusreactive/payload-plugins)
**npm**: `@focus-reactive/payload-plugin-ab`
**Payload versions**: 3.x

---

## Quick Start

### 1. Installation

```bash
pnpm add @focus-reactive/payload-plugin-ab
# or
npm install @focus-reactive/payload-plugin-ab
```

**Peer dependencies:** `payload ^3.0.0`, `next ^14 || ^15`, `react ^18 || ^19`.

For Vercel Edge Config storage: `pnpm add @vercel/edge-config`

---

### 2. Register the plugin

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { payloadGlobalAdapter } from "@focus-reactive/payload-plugin-ab/adapters/payload-global";

const abAdapter = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "",
});

export default buildConfig({
  plugins: [
    abTestingPlugin({
      storage: abAdapter,
      collections: {
        pages: {
          generatePath: ({ doc, locale }) => {
            const slug = doc.slug as string | undefined;
            if (!slug) return null;
            return locale ? `/${locale}/${slug}` : `/${slug}`;
          },
        },
      },
    }),
  ],
  // ... rest of your config
});
```

### 3. Add Next.js middleware

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createResolveAbRewrite } from "@focus-reactive/payload-plugin-ab/middleware";
import { payloadGlobalAdapter } from "@focus-reactive/payload-plugin-ab/adapters/payload-global";

const storage = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "",
});

const resolveAbRewrite = createResolveAbRewrite({
  storage,
  getBucket: (v) => v.bucket,
  getRewritePath: (v) => v.rewritePath,
  getPassPercentage: (v) => v.passPercentage,
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const result = await resolveAbRewrite(request, pathname, pathname, pathname);
  return result ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico).*)"],
};
```

### 4. Regenerate the import map

```bash
npx payload generate:importmap
# or: bunx payload generate:importmap
```

Without this, the Variants sidebar panel will not appear in the admin UI.

---

## Configuration Reference

| Option        | Type                                 | Default | Description                                        |
| ------------- | ------------------------------------ | ------- | -------------------------------------------------- |
| `enabled`     | `boolean`                            | `true`  | Enable/disable the plugin entirely                 |
| `debug`       | `boolean`                            | `false` | Show the `_abManifest` global in the admin sidebar |
| `collections` | `Record<string, CollectionABConfig>` | —       | **Required.** Key = collection slug                |
| `storage`     | `StorageAdapter`                     | —       | **Required.** Where to store the variant manifest  |

### CollectionABConfig

```ts
interface CollectionABConfig<TVariantData = DefaultVariantData> {
  slugField?: string; // field used to generate variant slugs (default: "slug")
  tenantField?: string; // dot-notation path; locks field on variants, scopes % validation
  generatePath(args: {
    // REQUIRED: maps doc to manifest key (URL path)
    doc: Record<string, unknown>;
    locale: string | undefined;
  }): string | null;
  generateVariantData?(args: {
    // optional: custom manifest data shape
    doc: Record<string, unknown>;
    variantDoc: Record<string, unknown>;
    locale: string | undefined;
  }): TVariantData;
}
```

`generatePath` is the only required function. Return `null` to skip a document (e.g., drafts or documents without a slug).

`generateVariantData` is optional. When omitted, the default shape is used:

```ts
type DefaultVariantData = {
  bucket: string; // variant's slug, e.g. "about--4ji9"
  rewritePath: string; // generatePath(variantDoc)
  passPercentage: number; // traffic % (1–99)
};
```

---

### Storage Adapters

#### payloadGlobalAdapter (recommended for most setups)

Stores the manifest in a Payload Global. Middleware reads it via the Payload REST API.

```ts
import { payloadGlobalAdapter } from "@focus-reactive/payload-plugin-ab/adapters/payload-global";

const storage = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "", // required
  globalSlug: "_abManifest", // optional, default: "_abManifest"
  apiRoute: "/api", // optional, default: "/api"
});
```

#### vercelEdgeAdapter (for sub-millisecond edge reads)

Stores the manifest in Vercel Edge Config. Requires additional env vars.

```ts
import { vercelEdgeAdapter } from "@focus-reactive/payload-plugin-ab/adapters/vercel-edge";

const storage = vercelEdgeAdapter({
  configID: process.env.EDGE_CONFIG_ID!,
  configURL: process.env.EDGE_CONFIG!,
  vercelRestAPIAccessToken: process.env.VERCEL_REST_API_ACCESS_TOKEN!,
  teamID: process.env.VERCEL_TEAM_ID, // optional
  manifestKey: "ab-testing", // optional, default: "ab-testing"
});
```

Required env vars for Vercel Edge: `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_REST_API_ACCESS_TOKEN`.

---

## What the Plugin Adds

1. **`_abVariants` sidebar field** — Rendered on original documents only. Shows variant list with per-variant traffic %, an "Add Variant" button, and delete controls.
2. **`_abVariantOf` relationship field** — Read-only, sidebar. Visible on variant documents only; links back to the parent original.
3. **`_abPassPercentage` hidden number field** — Stores traffic % (1–99) for a variant. Managed via the Variants panel; not exposed as a direct form field.
4. **`_abVariantPercentages` hidden JSON field** — Buffers pending % changes on the original; synced to variant docs on save.
5. **Modified slug field** — Hidden and read-only on variants (auto-generated as `{originalSlug}--{nanoid()}`).
6. **`POST /_ab/duplicate` endpoint** — Creates a variant by duplicating the parent, setting a new slug and `_abPassPercentage: 1`.
7. **Hooks** — `beforeChange` validates % sums; `afterChange` syncs percentages and recomputes the manifest; `afterDelete` clears stale manifest entries.
8. **`_abManifest` global** — Hidden from admin by default (`debug: false`). Stores the variant routing table read by middleware.

---

## Usage Patterns

### Localization (automatic)

When `payload.config.localization` is configured, the plugin writes a separate manifest entry per locale automatically. No extra configuration needed — `locale` is passed to `generatePath`.

```ts
generatePath: ({ doc, locale }) => {
  const slug = doc.slug as string;
  return locale ? `/${locale}/${slug}` : `/${slug}`;
},
```

### Multi-tenancy

```ts
abTestingPlugin({
  storage,
  collections: {
    pages: {
      tenantField: "tenant", // percentage validation is scoped per tenant
      generatePath: ({ doc, locale }) => {
        const tenantId = (doc.tenant as { id: string })?.id;
        const slug = doc.slug as string;
        return locale
          ? `/${tenantId}/${locale}/${slug}`
          : `/${tenantId}/${slug}`;
      },
    },
  },
});
```

### Custom variant data shape

```ts
abTestingPlugin({
  storage,
  collections: {
    pages: {
      generatePath: ({ doc }) => `/${doc.slug}`,
      generateVariantData: ({ variantDoc, locale }) => ({
        bucket: variantDoc.slug as string,
        rewritePath: `/${locale ?? "en"}/${variantDoc.slug}`,
        passPercentage: variantDoc._abPassPercentage as number,
        title: variantDoc.title as string, // add extra data for analytics
      }),
    },
  },
});
```

### Analytics — tracking impressions

```tsx
// Server component
import { ExperimentTracker } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { resolveAbCookieNames } from "@focus-reactive/payload-plugin-ab/middleware";

export default async function Page({ params }) {
  const experimentId = `/${params.slug}`;
  const { variantCookieName, visitorCookieName } = resolveAbCookieNames(
    undefined,
    experimentId
  );
  return (
    <>
      {/* page content */}
      <ExperimentTracker
        experimentId={experimentId}
        variantCookieName={variantCookieName}
        visitorCookieName={visitorCookieName}
      />
    </>
  );
}
```

### Analytics — tracking conversions

```tsx
"use client";
import { useABConversion } from "@focus-reactive/payload-plugin-ab/analytics/client";

export function CTAButton({
  experimentId,
  variantCookieName,
  visitorCookieName,
}) {
  const trackConversion = useABConversion({
    experimentId,
    variantCookieName,
    visitorCookieName,
  });
  return (
    <button onClick={() => trackConversion({ goalId: "cta_click" })}>
      Get Started
    </button>
  );
}
```

### Analytics — provider setup

```tsx
// app/layout.tsx
import { ABAnalyticsProvider } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { googleAnalyticsAdapter } from "@focus-reactive/payload-plugin-ab/analytics/adapters/google-analytics";

const analytics = googleAnalyticsAdapter({
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!,
  apiSecret: process.env.GA4_API_SECRET, // optional: server-side tracking
  propertyId: process.env.GA4_PROPERTY_ID, // optional: enables getStats()
});

export default function RootLayout({ children }) {
  return (
    <ABAnalyticsProvider adapter={analytics}>{children}</ABAnalyticsProvider>
  );
}
```

---

## Pitfalls

- **Import map must be regenerated** — Run `payload generate:importmap` after adding the plugin. Without it, the Variants sidebar panel will not appear.
- **`generatePath` returning `null`** — Documents where `generatePath` returns `null` are silently skipped in the manifest. This is intentional for drafts or incomplete documents.
- **`serverURL` is required for payloadGlobalAdapter** — Middleware reads the manifest via HTTP, so the URL must be reachable from the edge.
- **Vercel Edge Config needs 4 env vars** — `EDGE_CONFIG`, `EDGE_CONFIG_ID`, `VERCEL_REST_API_ACCESS_TOKEN`, and optionally `VERCEL_TEAM_ID`. Missing any one causes adapter initialization failures.
- **Total traffic percentage must not exceed 100** — The `beforeChange` hook validates that the sum of all variant `_abPassPercentage` values stays below 100. The original always gets the remainder.
- **Variants are hidden from list views** — Variant documents (those with `_abVariantOf` set) are filtered out of collection list views. They are only accessible from the Variants panel on the original.
- **Do not set `debug: true` in production** — This exposes the `_abManifest` global in the admin sidebar, which is intended only for development debugging.
- **SQL adapters need a migration** — After adding the plugin, run `payload migrate:create` and `payload migrate` to add the new hidden fields to the database.

---

## FAQ

**Q: Do I need to add anything to individual collection configs?**
A: No. The plugin patches collections automatically based on the slugs provided in the `collections` config key. No changes to your existing collection definitions are needed.

**Q: Can I use the plugin with MongoDB?**
A: Yes. No migration is needed for MongoDB. SQL adapters (Postgres, SQLite) require running a migration.

**Q: How are variants created?**
A: Via the Variants panel in the sidebar of any original document. Clicking "Add Variant" calls the `POST /_ab/duplicate` endpoint, which duplicates the document with a new slug (`original--xxxx`) and sets initial traffic to 1%.

**Q: How does sticky session routing work?**
A: On first visit, the middleware assigns a bucket (variant or original) based on weighted random selection and writes a session cookie (`payload_ab_bucket_{path}`). On subsequent visits, the middleware reads that cookie and routes to the same variant every time.

**Q: What cookies does the plugin set?**
A: Three cookies: `payload_ab_bucket_{path}` (session, bucket assignment), `ab_visitor_id` (365-day, persistent visitor ID for analytics), `exp_{path}` (90-day, client-readable for analytics adapters).

**Q: Can I use a custom analytics provider instead of Google Analytics?**
A: Yes. Implement the `AnalyticsAdapter` interface and pass it to `ABAnalyticsProvider`. Google Analytics is a built-in adapter; custom adapters are fully supported.

**Q: What happens if `generatePath` returns the same path for multiple documents?**
A: The last document processed will overwrite earlier entries in the manifest. Ensure `generatePath` returns unique paths per document.

## Further Reading

- Working examples → `./examples.md`
