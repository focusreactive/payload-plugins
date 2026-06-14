# @focus-reactive/payload-plugin-analytics

A GA4-backed analytics plugin for [Payload CMS](https://payloadcms.com/) v3 + Next.js. Adds a full analytics dashboard **inside the Payload admin** — KPIs, traffic, top pages/sources/events, devices, geography, sessions, journeys, and lead-action conversions — plus a tiny client-side tracking layer for your front end. Optional A/B analytics tab integrates with [`@focus-reactive/payload-plugin-ab`](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab).

There are two halves:

- **Server** — `analyticsPlugin()` registers an admin dashboard view and REST endpoints that read your data from the **GA4 Data API** using a service account.
- **Client** — `<AnalyticsProvider>` + `ga4Provider()` load `gtag.js`, track page views and route changes, and fire engagement / lead-action events to GA4.

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload + Next.js project.

```
I want to add an analytics dashboard to my Payload CMS v3 + Next.js project using @focus-reactive/payload-plugin-analytics.

## How it works

The plugin has a server half and a client half:

- Server: analyticsPlugin() in payload.config.ts injects an admin view at /analytics and REST
  endpoints under /api/analytics/*. The endpoints read reports from the GA4 Data API using a
  Google service account. Nothing is stored in your database — GA4 is the source of truth.
- Client: <AnalyticsProvider provider={ga4Provider({ measurementId })}> wraps your front-end app.
  It injects gtag.js, tracks page_view on first load and on every route change, and exposes
  helpers to fire engagement and "lead_action" conversion events.

## Prerequisites (GA4)

1. A GA4 property — note its Measurement ID (G-XXXXXXX) and numeric Property ID.
2. A Google Cloud service account with the Google Analytics Data API enabled. Create a JSON key
   and grant the service account "Viewer" on the GA4 property (Admin → Property Access Management).
3. In GA4 → Admin → Custom definitions, register the EVENT-SCOPED custom dimensions and the
   custom metric the plugin reads (see "Register custom dimensions and the conversion event"
   below for the full table). At minimum:
   - Custom dimensions (scope = Event): `fr_session_id`, `fr_session_start`, `fr_event_seq`,
     `fr_lead_type`, and — if you use the A/B tab — `fr_ab_experiment`, `fr_ab_variant`,
     `fr_ab_visitor_id`.
   - Custom metric (scope = Event): `fr_elapsed_ms` (powers avg time-to-action on the Lead
     Actions tab).

## Installation

pnpm add @focus-reactive/payload-plugin-analytics

## Step 1 — Register the plugin in payload.config.ts

import { analyticsPlugin } from '@focus-reactive/payload-plugin-analytics'

// Inside buildConfig({ plugins: [...] })
analyticsPlugin({
  ga4: {
    measurementId: process.env.GA4_MEASUREMENT_ID!,         // G-XXXXXXX
    propertyId: process.env.GA4_PROPERTY_ID!,               // numeric
    serviceAccount: {
      clientEmail: process.env.GA4_CLIENT_EMAIL!,
      // Env vars escape newlines — un-escape them:
      privateKey: (process.env.GA4_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    },
  },
  leadActions: {
    types: ['phone_click', 'email_click', 'form_submit'],   // lead types you fire
  },
})

The admin dashboard, header link, and endpoints are injected automatically — no manual admin wiring.

## Step 2 — Wrap your front end with the provider (Client Component)

// app/providers.tsx
'use client'
import { AnalyticsProvider, ga4Provider } from '@focus-reactive/payload-plugin-analytics/client'

export function Analytics({ measurementId, children }) {
  return <AnalyticsProvider provider={ga4Provider({ measurementId })}>{children}</AnalyticsProvider>
}

// app/layout.tsx (Server Component)
import { Analytics } from './providers'
export default function RootLayout({ children }) {
  return (
    <html><body>
      <Analytics measurementId={process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!}>{children}</Analytics>
    </body></html>
  )
}

## Step 3 — Fire conversion events

import { TrackLeadAction } from '@focus-reactive/payload-plugin-analytics/client'

<TrackLeadAction on="click" type="phone_click">
  <a href="tel:+1234567890">Call us</a>
</TrackLeadAction>

## Important notes

- ga4.measurementId must match /^G-[A-Z0-9]+$/ and ga4.propertyId is required — the plugin throws
  on buildConfig otherwise.
- The service account private key must be a real multi-line PEM at runtime. When stored in an env
  var, un-escape "\n" as shown above.
- The dashboard reads GA4 directly. New events take a few minutes to appear; GA4 also samples and
  applies its own data-freshness rules.
- The Lead Actions tab only works if "fr_lead_type" is registered as a custom dimension in GA4.
- AnalyticsProvider must be a client component boundary (it renders gtag scripts). Mount it once,
  as high as possible — nesting it fires duplicate page_view events (a dev warning is logged).
```

---

## How It Works

GA4 is the single source of truth. The plugin never writes analytics data to your database — it **reads** GA4 on the server for the dashboard and **writes** to GA4 from the browser via `gtag.js`.

```
                    ┌─────────────────────────── Browser ───────────────────────────┐
                    │  <AnalyticsProvider provider={ga4Provider(...)}>                │
   Your front end → │    • injects gtag.js                                            │
                    │    • page_view on load + every route change                     │
                    │    • <Track> / <TrackLeadAction> / useAnalytics() → events      │
                    └───────────────────────────────┬─────────────────────────────────┘
                                                     │  events
                                                     ▼
                                          ┌──────────────────┐
                                          │   GA4 property   │
                                          └────────┬─────────┘
                                                   │  Data API (service account)
                                                   ▼
                    ┌──────────────────────── Payload admin ─────────────────────────┐
                    │  analyticsPlugin() → /api/analytics/* endpoints                 │
                    │                    → Analytics view at /admin/analytics         │
                    │  KPIs · Top pages/sources/events · Devices · Geo · Sessions ·   │
                    │  Journeys · Lead actions · (optional) A/B tab                   │
                    └─────────────────────────────────────────────────────────────────┘
```

The dashboard view, the **Analytics** header icon, the admin providers, and all REST endpoints are injected into your Payload config automatically. You only register the plugin and mount the client provider.

---

## GA4 Setup

The plugin talks to two GA4 surfaces: the browser sends events via `gtag.js` (Measurement ID), and the server reads reports via the GA4 **Data API** (Property ID + service account). Set both up once.

### 1. Get your GA4 identifiers

- **Measurement ID** — `G-XXXXXXX`. GA4 → Admin → Data Streams → your web stream.
- **Property ID** — the numeric ID (e.g. `123456789`). GA4 → Admin → Property Settings.

### 2. Create a service account for the Data API

1. In [Google Cloud Console](https://console.cloud.google.com/), create (or pick) a project.
2. Enable the **Google Analytics Data API**.
3. Create a **Service Account** → add a **JSON key**. From the key file you need `client_email` and `private_key`.

### 3. Grant the service account access to the GA4 property

GA4 → Admin → **Property Access Management** → add the service account's `client_email` with at least the **Viewer** role. Without this, every report returns a permission error.

### 4. Register custom dimensions and the conversion event

GA4 → Admin → **Custom definitions** → **Create custom dimension** (scope = **Event**):

| Parameter name     | Scope | Required for                                        |
| ------------------ | ----- | --------------------------------------------------- |
| `fr_session_id`    | Event | Sessions tab and Session drawer (session identity)  |
| `fr_session_start` | Event | Session start time / session ordering               |
| `fr_event_seq`     | Event | Within-minute event ordering in journeys and drawer |
| `fr_lead_type`     | Event | Lead Actions tab                                    |
| `fr_ab_experiment` | Event | A/B tab (optional)                                  |
| `fr_ab_variant`    | Event | A/B tab (optional)                                  |
| `fr_ab_visitor_id` | Event | A/B tab (optional)                                  |

Then create the matching **custom metric** under the same **Custom definitions** screen → **Create custom metric** (scope = **Event**):

| Parameter name  | Scope | Unit / Type   | Required for                               |
| --------------- | ----- | ------------- | ------------------------------------------ |
| `fr_elapsed_ms` | Event | Standard (ms) | Avg time-to-action on the Lead Actions tab |

The plugin fires lead conversions as a `lead_action` event carrying the `fr_lead_type` parameter (and `fr_elapsed_ms` for timing). GA4 only lets you query a custom parameter once it's registered as a dimension or metric, so these steps are mandatory for the tabs noted above. Dimensions that aren't registered degrade gracefully — the affected tab shows a "setup required" hint instead of failing.

### 5. Provide the values to the plugin

```bash
# .env
GA4_MEASUREMENT_ID=G-XXXXXXX
GA4_PROPERTY_ID=123456789
GA4_CLIENT_EMAIL=analytics@your-project.iam.gserviceaccount.com
GA4_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXX
```

> **Gotcha:** env files store the private key with literal `\n` sequences. Un-escape them before passing to the plugin: `privateKey: process.env.GA4_PRIVATE_KEY!.replace(/\\n/g, '\n')`.

---

## Installation

The plugin ships its React UI and charts as **peer dependencies** so it shares a single copy with your app. Install the plugin together with its required peers:

```bash
pnpm add @focus-reactive/payload-plugin-analytics \
  @payloadcms/ui @payloadcms/next @tanstack/react-query \
  lucide-react react-day-picker recharts
```

| Peer dependency         | Range          | Why                                          |
| ----------------------- | -------------- | -------------------------------------------- |
| `payload`               | `^3.0.0`       | Core — the plugin targets Payload v3         |
| `@payloadcms/ui`        | `^3.0.0`       | Admin UI primitives used by the dashboard    |
| `@payloadcms/next`      | `^3.0.0`       | Admin view + endpoint wiring                 |
| `@tanstack/react-query` | `^5.59.0`      | Data fetching/caching in the dashboard       |
| `lucide-react`          | `^0.469.0`     | Icons (KPIs, lead-action registry)           |
| `react-day-picker`      | `^9.0.0`       | Date-range picker in the filter bar          |
| `recharts`              | `^2.15.0`      | Trend / donut charts                         |
| `next`                  | `^14 \|\| ^15` | Optional — only for the client tracking half |
| `react` / `react-dom`   | `^18 \|\| ^19` | Optional — only for the client tracking half |

`next`, `react`, and `react-dom` are declared optional, but any real Payload v3 + Next.js app already provides them.

---

## Quick Start

### Step 1 — Register the plugin (server)

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { analyticsPlugin } from "@focus-reactive/payload-plugin-analytics";

export default buildConfig({
  plugins: [
    analyticsPlugin({
      ga4: {
        measurementId: process.env.GA4_MEASUREMENT_ID!, // G-XXXXXXX
        propertyId: process.env.GA4_PROPERTY_ID!, // numeric
        serviceAccount: {
          clientEmail: process.env.GA4_CLIENT_EMAIL!,
          privateKey: (process.env.GA4_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
        },
      },
      leadActions: {
        types: ["phone_click", "email_click", "form_submit"],
      },
    }),
  ],
});
```

This injects, with no further admin configuration:

- An **Analytics** view at `/admin/analytics`
- A chart icon in the admin header (tooltip "Analytics") linking to the view
- REST endpoints under `/api/analytics/*`
- The admin providers needed by the dashboard

### Step 2 — Wrap your front end with the provider

`ga4Provider()` returns a provider object, so the wrapper must be a Client Component. Create it once and mount it at the root of your app:

```tsx
// app/AnalyticsProviderClient.tsx
"use client";

import { AnalyticsProvider, ga4Provider } from "@focus-reactive/payload-plugin-analytics/client";
import type { ReactNode } from "react";

export function AnalyticsProviderClient({ measurementId, children }: { measurementId: string; children: ReactNode }) {
  return <AnalyticsProvider provider={ga4Provider({ measurementId })}>{children}</AnalyticsProvider>;
}
```

```tsx
// app/layout.tsx (Server Component)
import { AnalyticsProviderClient } from "./AnalyticsProviderClient";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProviderClient measurementId={process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID!}>
          <main>{children}</main>
        </AnalyticsProviderClient>
      </body>
    </html>
  );
}
```

`page_view` now fires automatically on first load and on every client-side route change.

### Step 3 — Open the dashboard

Start your app, sign into the Payload admin, and click the chart icon in the header (or visit `/admin/analytics`). Pick a date range and comparison in the filter bar. Data appears once GA4 has collected events and the service account has property access.

---

## Configuration Reference

### Plugin Options

```ts
interface AnalyticsPluginConfig {
  /** GA4 connection — required. */
  ga4: Ga4Config;

  /** Skip the plugin entirely (returns the config untouched). */
  disabled?: boolean;

  /** Lead-action types + admin icon/label registry. */
  leadActions?: LeadActionsPluginConfig;

  /** Auto-attach DOM listeners on the client for common lead actions. */
  autoTrackLeadActions?: AutoTrackLeadActionsConfig;

  /** Gate access to the dashboard endpoints. Receives the Payload request. */
  access?: (args: { req: PayloadRequest }) => boolean | Promise<boolean>;

  /** Override / extend i18n strings used by the dashboard. */
  translations?: Translations;

  /** Register custom dashboard blocks (component + optional server fetch). */
  blocks?: Record<BlockId, Partial<BlockDefinition>>;

  /** Reorder, resize, enable/disable, or add rows & blocks per tab. */
  layout?: AnalyticsLayoutConfigInput;

  /** Enable the A/B analytics tab (integrates with payload-plugin-ab). */
  ab?: AbIntegrationConfig;
}
```

### Ga4Config

```ts
interface Ga4Config {
  /** GA4 numeric Property ID — used by the Data API (server reports). */
  propertyId: string;
  /** GA4 Measurement ID (G-XXXXXXX) — used by gtag.js (client events). */
  measurementId: string;
  serviceAccount: {
    clientEmail: string;
    privateKey: string; // real multi-line PEM at runtime
  };
}
```

Validation at `buildConfig` time: `measurementId` must match `^G-[A-Z0-9]+$`, `propertyId` is required, and a warning is logged if the service-account credentials are missing.

### LeadActionsPluginConfig

```ts
interface LeadActionsPluginConfig {
  /** Lead-action type identifiers your front end fires (e.g. 'phone_click'). */
  types?: string[];
  /** Import path to a default-exported lead-action registry component
   *  (see "Lead Actions" → admin icons). e.g. '@/lead-actions-admin#default' */
  adminRegistry?: string;
}
```

### AutoTrackLeadActionsConfig

```ts
interface AutoTrackLeadActionsConfig {
  phoneClicks?: boolean; // tel: links
  emailClicks?: boolean; // mailto: links
  directionsClicks?: boolean; // map / directions links
  whatsappClicks?: boolean;
  telegramClicks?: boolean;
  formSubmits?: boolean;
}
```

Passed to `<AnalyticsProvider autoTrackLeadActions={...}>` on the client; the plugin attaches DOM listeners that fire the matching `lead_action` events without per-element markup.

---

## Client Tracking

All client exports come from `@focus-reactive/payload-plugin-analytics/client`.

### `<AnalyticsProvider>`

Mount once at the app root. Injects the provider's scripts (gtag.js), tracks route changes, and wires the lead-action registry.

```tsx
<AnalyticsProvider
  provider={ga4Provider({ measurementId })}
  leadActionTypes={["phone_click", "cta_pricing_click"]} // optional
  autoTrackLeadActions={{ phoneClicks: true, formSubmits: true }} // optional
  trackRouteChanges // default: true
>
  {children}
</AnalyticsProvider>
```

| Prop                   | Type                         | Default | Description                                       |
| ---------------------- | ---------------------------- | ------- | ------------------------------------------------- |
| `provider`             | `AnalyticsProvider` adapter  | —       | Usually `ga4Provider({ measurementId })`          |
| `leadActionTypes`      | `string[]`                   | —       | Lead-action types available on the client         |
| `autoTrackLeadActions` | `AutoTrackLeadActionsConfig` | —       | Auto-attach DOM listeners for common lead actions |
| `trackRouteChanges`    | `boolean`                    | `true`  | Fire `page_view` on Next.js client navigation     |

> Mount it **once**. A nested `<AnalyticsProvider>` logs a dev warning and causes duplicate `page_view` events.

### `ga4Provider`

```ts
import { ga4Provider } from "@focus-reactive/payload-plugin-analytics/client";

const provider = ga4Provider({ measurementId: "G-XXXXXXX" });
```

Returns an `AnalyticsProvider` adapter that loads `gtag.js`, pushes events to the GA4 dataLayer, and reports page views (with title + URL). The adapter interface is small — implement it yourself to target a different backend:

```ts
interface AnalyticsProvider {
  readonly name: string;
  Scripts: () => ReactNode;
  trackEvent: (name: string, payload?: Record<string, unknown>) => void;
  pageView: (path: string) => void;
}
```

### `<Track>` — declarative events

Wraps a **single** child element and fires an event on an interaction. It merges with the child's existing handler, so your `onClick`/`onSubmit` still runs.

```tsx
import { Track } from "@focus-reactive/payload-plugin-analytics/client";

<Track on="click" event="cta_click" payload={{ location: "hero" }}>
  <button onClick={doThing}>Get started</button>
</Track>;
```

`on` accepts `"click" | "submit" | "view" | "hover"`. `on="view"` fires once when the element scrolls into view.

### `<TrackLeadAction>` — conversion events

A thin wrapper over `<Track>` that fires the `lead_action` event with `fr_lead_type` set to `type`.

```tsx
import { TrackLeadAction } from "@focus-reactive/payload-plugin-analytics/client";

<TrackLeadAction on="click" type="phone_click">
  <a href="tel:+1234567890">Call us</a>
</TrackLeadAction>;
```

### `useAnalytics()` — imperative API

```tsx
import { useAnalytics } from "@focus-reactive/payload-plugin-analytics/client";

function ContactForm() {
  const { track, trackLeadAction, pageView } = useAnalytics();

  return (
    <form
      onSubmit={() => {
        trackLeadAction("form_submit", { form: "contact" });
      }}>
      {/* ... */}
    </form>
  );
}
```

| Method                      | Fires                                                          |
| --------------------------- | -------------------------------------------------------------- |
| `track(event, payload?)`    | A custom GA4 event                                             |
| `trackLeadAction(type, p?)` | `lead_action` with `fr_lead_type = type`                       |
| `pageView(path)`            | A manual `page_view` (rarely needed — route changes auto-fire) |

### Event names

The plugin exports the GA4 event-name constants it relies on:

```ts
import {
  TRAFFIC_EVENTS, // page_view, session_start, first_visit, user_engagement
  ENGAGEMENT_EVENTS, // scroll, click, form_start, form_submit, video_start, ...
  LEAD_ACTION_EVENT_NAME, // 'lead_action'
  FR_LEAD_TYPE_PARAM, // 'fr_lead_type'
  BUILT_IN_LEAD_ACTION_TYPES,
} from "@focus-reactive/payload-plugin-analytics/client";
```

---

## Lead Actions

Lead actions are the conversions the dashboard's **Lead Actions** tab measures. They're all the same GA4 event — `lead_action` — distinguished by the `fr_lead_type` parameter.

### Built-in types

```
phone_click · email_click · directions_click · whatsapp_click
telegram_click · website_click · booking_click · form_submit
```

### Custom types

Declare your own types in plugin config (so the dashboard knows to query them) and fire them from the client:

```ts
// payload.config.ts
analyticsPlugin({
  ga4: {
    /* ... */
  },
  leadActions: {
    types: ["phone_click", "email_click", "form_submit", "cta_pricing_click"],
  },
});
```

```tsx
<TrackLeadAction on="click" type="cta_pricing_click">
  <button>See pricing</button>
</TrackLeadAction>
```

Unknown types still render in the dashboard with a humanized label and a fallback icon.

### Firing options

| Approach                           | Use when                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| `<TrackLeadAction>`                | You control the element and want declarative markup         |
| `useAnalytics().trackLeadAction()` | You fire from a handler / effect                            |
| `autoTrackLeadActions`             | Common patterns (`tel:`, `mailto:`, form submits) site-wide |

Auto-tracking respects an opt-out: add `data-analytics-skip` to any element you don't want auto-tracked.

### Admin icons & labels

Customize how lead-action types render in the dashboard (icon + label) with a registry. Create a client module that default-exports a registry component:

```tsx
// lead-actions-admin.tsx
"use client";

import { createLeadActionRegistry } from "@focus-reactive/payload-plugin-analytics/client";
import { Zap } from "lucide-react";

export default createLeadActionRegistry({
  cta_pricing_click: { icon: Zap, label: "Pricing CTA" },
});
```

Then point `leadActions.adminRegistry` at it (Payload component-path syntax):

```ts
analyticsPlugin({
  ga4: {
    /* ... */
  },
  leadActions: {
    types: ["cta_pricing_click"],
    adminRegistry: "@/lead-actions-admin#default",
  },
});
```

Your entries are merged over the built-in registry, so you only declare what you want to override.

---

## Dashboard & Layout Customization

The dashboard has three built-in tabs:

| Tab            | Built-in blocks                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `overview`     | `sessions-kpi`, `users-kpi`, `pageviews-kpi`, `bounce-rate-kpi`, `avg-duration-kpi`, `trend-chart`, `top-pages`, `top-sources`, `top-events`, `devices-donut`, `top-countries` |
| `lead-actions` | `total-leads-kpi`, `conversion-rate-kpi`, `avg-time-kpi`, `lead-actions-by-type`, `per-page-breakdown`, `discovery-paths`                                                      |
| `sessions`     | Session list + per-session event drawer                                                                                                                                        |

### Reorder, resize, hide

The `layout` option lets you override placement per tab → row → block. Each block placement takes `order`, `colSpan`, and `enabled`; each row takes `order`, `columns`, and `enabled`.

```ts
analyticsPlugin({
  ga4: {
    /* ... */
  },
  layout: {
    tabs: {
      overview: {
        rows: {
          "kpi-row": {
            columns: 4,
            blocks: {
              "bounce-rate-kpi": { enabled: false }, // hide a block
              "sessions-kpi": { order: 0, colSpan: 1 }, // reposition / resize
            },
          },
        },
      },
    },
  },
});
```

Built-in row IDs: overview → `kpi-row`, `trend-row`, `top-row`, `devices-countries-row`; lead-actions → `kpi-row`, `by-type-row`, `per-page-row`, `journeys-row`.

### Custom blocks

Register your own block with a React component and an optional server-side `fetch` that runs against a property-scoped GA4 client. Place it in the layout like any built-in block.

```tsx
// payload.config.ts
import type { BlockFetchArgs } from "@focus-reactive/payload-plugin-analytics";

analyticsPlugin({
  ga4: {
    /* ... */
  },
  blocks: {
    "my-metric": {
      component: "@/blocks/MyMetric#default", // client component path
      fetch: async ({ dateRange, comparison, ga4, req }: BlockFetchArgs) => {
        const report = await ga4.runReport({
          /* GA4 Data API request */
        });
        return shapeForUi(report);
      },
    },
  },
  layout: {
    tabs: {
      overview: {
        rows: {
          "top-row": { blocks: { "my-metric": { order: 0, colSpan: 2 } } },
        },
      },
    },
  },
});
```

The server result is fetched via `/api/analytics/custom/my-metric` and handed to your component as `data`:

```ts
interface BlockComponentProps<TData = unknown> {
  data?: TData;
  loading?: boolean;
  error?: Error;
  dateRange: DateRange;
  comparison: Comparison;
  colSpan: number;
  t: (key: string) => string;
  className?: string;
}
```

To match the built-in look, import the dashboard's UI primitives and query hooks from the `/client/blocks` entry:

```tsx
import {
  DataCard,
  KpiCard,
  BarList,
  TopNTable,
  DonutChart,
  TrendChart,
  SkeletonBlock,
  ErrorTile,
  useCustomBlockQuery,
} from "@focus-reactive/payload-plugin-analytics/client/blocks";
```

### Access control

Gate the dashboard endpoints behind your own rule:

```ts
analyticsPlugin({
  ga4: {
    /* ... */
  },
  access: ({ req }) => Boolean(req.user) && req.user.role === "admin",
});
```

---

## A/B Tab

When you pass an `ab` config, the dashboard gains an **A/B** tab that computes exposure, conversion rate, lift, statistical significance, sample-ratio-mismatch (SRM), and a portfolio win-rate. It reads the A/B plugin's `ab-experiments` collection plus the `fr_ab_*` GA4 dimensions.

This tab is designed to pair with [`@focus-reactive/payload-plugin-ab`](https://www.npmjs.com/package/@focus-reactive/payload-plugin-ab):

1. Run A/B tests with the AB plugin and mount its `<ExperimentTracker>` on variant-served pages — it stamps `fr_ab_experiment`, `fr_ab_variant`, and `fr_ab_visitor_id` on every GA4 event.
2. Register those three dimensions in GA4 (see [GA4 Setup](#ga4-setup)).
3. Enable the tab here:

```ts
analyticsPlugin({
  ga4: {
    /* ... */
  },
  ab: {}, // presence of the key turns the tab on
});
```

Conversions on the A/B tab are the same `lead_action` events as the rest of the dashboard — there's no separate AB conversion event.

### AbIntegrationConfig

```ts
interface AbIntegrationConfig {
  /** Slug of the AB plugin's experiments collection. Default: 'ab-experiments'. */
  experimentsCollectionSlug?: string;

  /** Override the GA4 dimension parameter names (must match what the tracker stamps). */
  dimensions?: { experiment?: string; variant?: string; visitorId?: string };

  /** Significance / SRM tuning. */
  stats?: {
    alpha?: number; // significance threshold. default 0.05
    power?: number; // statistical power (1 - beta). default 0.80
    srmThreshold?: number; // SRM chi-square failure threshold. default 0.001
    srmWindowDays?: number; // trailing window for the SRM check. default 7
  };

  /** Win-rate qualification. alpha/power inherited from `stats`. */
  winRate?: {
    mdeCeiling?: number; // qualifies when relative MDE ≤ this. default 0.20
    sessionFloor?: number; // per-bucket session floor. default 100
  };

  /** Map the AB plugin's field names if you customized them. */
  variantFields?: { variantOf?: string; passPercentage?: string; slug?: string; name?: string };
}
```

---

## Exports Reference

| Import path                                                                             | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-analytics`                                              | `analyticsPlugin`; config types (`AnalyticsPluginConfig`, `Ga4Config`, `AccessFn`, `AutoTrackLeadActionsConfig`, `AbIntegrationConfig`, `LeadActionsPluginConfig`, …); query/response types; layout types (`BlockDefinition`, `BlockFetchArgs`, `BlockComponentProps`, `AnalyticsLayoutConfigInput`, …); event + endpoint constants (`TRAFFIC_EVENTS`, `ENGAGEMENT_EVENTS`, `LEAD_ACTION_EVENT_NAME`, `ANALYTICS_ENDPOINT_PATHS`, layout `BUILTIN_*` ids) |
| `@focus-reactive/payload-plugin-analytics/client`                                       | `AnalyticsProvider`, `ga4Provider`, `Track`, `TrackLeadAction`, `useAnalytics`, `useLeadActionTypes`, `createLeadActionRegistry`, `LeadActionRegistryProvider`, `useLeadActionRegistry`, event constants + types                                                                                                                                                                                                                                          |
| `@focus-reactive/payload-plugin-analytics/client/blocks`                                | UI primitives for custom blocks: `DataCard`, `KpiCard`, `BarList`, `TopNTable`, `DonutChart`, `TrendChart`, `SkeletonBlock`, `ErrorTile`, `EmptyTile`, `SetupRequiredCard`; hooks `useCustomBlockQuery`, `useSessionsQuery`, `useSessionDetailQuery`                                                                                                                                                                                                      |
| `@focus-reactive/payload-plugin-analytics/components/AnalyticsView`                     | The dashboard view component (auto-registered by the plugin)                                                                                                                                                                                                                                                                                                                                                                                              |
| `@focus-reactive/payload-plugin-analytics/components/AnalyticsView/AnalyticsHeaderLink` | The admin header link component (auto-registered by the plugin)                                                                                                                                                                                                                                                                                                                                                                                           |
| `@focus-reactive/payload-plugin-analytics/admin.css`                                    | Dashboard stylesheet (the view imports it itself; exposed for manual control)                                                                                                                                                                                                                                                                                                                                                                             |

---

## License

MIT © [FocusReactive](https://focusreactive.com)
