# Domain Access Layer (DAL)

App-layer data access lives here. Everything in this folder is a thin, typed
wrapper around Payload's Local API (or other data sources later — Stripe, R2,
Klaviyo, etc.). **Application code never calls `getPayload({ config })`
directly** — it imports from `@/dal/...`.

## Why

- **Single seam.** All app-side data access is in one place: easier to cache,
  trace, mock, and reason about.
- **Single Payload client.** `payload-client.ts` is the one place that calls
  `getPayload({ config })`. Centralizing it keeps caching/instance reuse
  consistent.
- **Domain-shaped API.** Callers ask for `getPageBySlug({ slug, locale })`,
  not `payload.find({ collection: 'page', where: { ... } })`. The shape of
  the query is the DAL's concern; the call site stays readable.
- **Future extensibility.** When this app talks to Stripe / R2 / Klaviyo /
  Algolia, those wrappers live next to the Payload wrappers (`./stripe.ts`,
  `./media-storage.ts`, …) so consumers have one import root.

## Structure

```
src/dal/
├── README.md
├── index.ts             ← public barrel (import from '@/dal')
├── payload-client.ts    ← the ONLY caller of getPayload({ config })
├── pages.ts             ← page document reads
├── posts.ts             ← post reads + related + listing
├── documents.ts         ← generic find / findByID across collections
├── globals.ts           ← site-settings, header, footer, blog page settings
├── media.ts             ← default media slot lookup
├── redirects.ts         ← redirects collection reads
├── users.ts             ← user lookup / SSO helpers
└── locales.ts           ← alternate locale URL resolution
```

## Where the DAL applies — and where it doesn't

The DAL is **app-layer**. Use it from:

- Route handlers (`src/app/.../route.ts`)
- Server components / pages (`page.tsx`, `layout.tsx`)
- `sitemap.ts`, `robots.ts`, `generateMetadata`, `generateStaticParams`
- API endpoints / webhooks under `src/app/(payload)/api/auth/...`

The DAL is **not** appropriate inside Payload's request lifecycle. There you
already have a transactional `req.payload` and must use it:

- Collection / field / global hooks (`beforeChange`, `afterChange`, …)
- Field `validate` functions
- `access` control functions
- Custom Payload endpoints that receive a `PayloadRequest`

The rule: **inside Payload's request lifecycle, use `req.payload` — outside it,
use the DAL.** Hooks that read sibling data must pass `req` through so the
operation joins the surrounding transaction.

## How to add a new method

1. Pick the right domain file (or create one if the surface is genuinely new).
2. Add a typed function that takes a small, named-arg options object.
3. Get the Payload instance via `await getPayloadClient()` — never import
   `getPayload` from `payload` outside `payload-client.ts`.
4. Wrap with `react.cache` (per-request memoization) and/or
   `unstable_cache` (cross-request cache with tags) as appropriate.
5. Re-export from `src/dal/index.ts` if it's part of the public surface.

## Caching

- `react.cache` deduplicates within a single render pass.
- `next/cache.unstable_cache` deduplicates across requests; pair with
  `revalidateTag` (see `src/core/lib/cacheTags.ts`).
- Tag every cached read so collection/global hooks can invalidate it via
  `revalidateTag`.

## Future adapters

When this app starts talking to other systems, add a new file next to the
Payload modules:

```
src/dal/
├── stripe.ts            # billing reads / customer portal session
├── media-storage.ts     # R2 / S3 signed-URL issuance
├── klaviyo.ts           # transactional email sends, list operations
└── analytics.ts         # Mixpanel / PostHog server-side events
```

Each adapter exposes a small, domain-shaped surface — never raw client objects.
