# Examples

## Full Example — payloadGlobalAdapter

Configuration with all main options using the Payload Global storage adapter.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { payloadGlobalAdapter } from "@focus-reactive/payload-plugin-ab/adapters/payload-global";

const abAdapter = payloadGlobalAdapter({
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL ?? "",
  globalSlug: "_abManifest",
});

export default buildConfig({
  plugins: [
    abTestingPlugin({
      enabled: true,
      debug: false,
      storage: abAdapter,
      collections: {
        pages: {
          slugField: "slug",
          generatePath: ({ doc, locale }) => {
            const slug = doc.slug as string | undefined;
            if (!slug) return null;
            return locale ? `/${locale}/${slug}` : `/${slug}`;
          },
        },
        posts: {
          generatePath: ({ doc, locale }) => {
            const slug = doc.slug as string | undefined;
            if (!slug) return null;
            return locale ? `/${locale}/blog/${slug}` : `/blog/${slug}`;
          },
        },
      },
    }),
  ],
});
```

---

## Full Example — vercelEdgeAdapter

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { abTestingPlugin } from "@focus-reactive/payload-plugin-ab";
import { vercelEdgeAdapter } from "@focus-reactive/payload-plugin-ab/adapters/vercel-edge";

const abAdapter = vercelEdgeAdapter({
  configID: process.env.EDGE_CONFIG_ID!,
  configURL: process.env.EDGE_CONFIG!,
  vercelRestAPIAccessToken: process.env.VERCEL_REST_API_ACCESS_TOKEN!,
  teamID: process.env.VERCEL_TEAM_ID,
  manifestKey: "ab-testing",
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
});
```

---

## Next.js Middleware — Full Setup

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

  // Skip non-page paths
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const result = await resolveAbRewrite(request, pathname, pathname, pathname);
  return result ?? NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
```

---

## Analytics — Full Provider + Tracker + Conversion

```tsx
// app/layout.tsx
import { ABAnalyticsProvider } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { googleAnalyticsAdapter } from "@focus-reactive/payload-plugin-ab/analytics/adapters/google-analytics";

const analytics = googleAnalyticsAdapter({
  measurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!,
  apiSecret: process.env.GA4_API_SECRET,
  propertyId: process.env.GA4_PROPERTY_ID,
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ABAnalyticsProvider adapter={analytics}>
          {children}
        </ABAnalyticsProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/[slug]/page.tsx — track impressions
import { ExperimentTracker } from "@focus-reactive/payload-plugin-ab/analytics/client";
import { resolveAbCookieNames } from "@focus-reactive/payload-plugin-ab/middleware";

export default async function Page({ params }: { params: { slug: string } }) {
  const experimentId = `/${params.slug}`;
  const { variantCookieName, visitorCookieName } = resolveAbCookieNames(
    undefined,
    experimentId
  );
  return (
    <main>
      <h1>Page content</h1>
      <ExperimentTracker
        experimentId={experimentId}
        variantCookieName={variantCookieName}
        visitorCookieName={visitorCookieName}
      />
    </main>
  );
}
```

```tsx
// components/CTAButton.tsx — track conversions
"use client";
import { useABConversion } from "@focus-reactive/payload-plugin-ab/analytics/client";

interface CTAButtonProps {
  experimentId: string;
  variantCookieName: string;
  visitorCookieName: string;
}

export function CTAButton({
  experimentId,
  variantCookieName,
  visitorCookieName,
}: CTAButtonProps) {
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

---

## Multi-tenant Setup

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
          tenantField: "tenant",
          generatePath: ({ doc, locale }) => {
            const tenantId = (doc.tenant as { id: string } | undefined)?.id;
            const slug = doc.slug as string | undefined;
            if (!tenantId || !slug) return null;
            return locale
              ? `/${tenantId}/${locale}/${slug}`
              : `/${tenantId}/${slug}`;
          },
        },
      },
    }),
  ],
});
```

---

## Custom Variant Data Shape

```ts
// Define custom variant data type
interface MyVariantData {
  bucket: string;
  rewritePath: string;
  passPercentage: number;
  pageTitle: string; // extra field for analytics labeling
}

abTestingPlugin<MyVariantData>({
  storage: abAdapter,
  collections: {
    pages: {
      generatePath: ({ doc }) => {
        const slug = doc.slug as string | undefined;
        return slug ? `/${slug}` : null;
      },
      generateVariantData: ({ variantDoc }) => ({
        bucket: variantDoc.slug as string,
        rewritePath: `/${variantDoc.slug}`,
        passPercentage: variantDoc._abPassPercentage as number,
        pageTitle: variantDoc.title as string,
      }),
    },
  },
});
```
