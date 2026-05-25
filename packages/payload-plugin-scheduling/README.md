# @focus-reactive/payload-plugin-schedule-publication

Scheduled publication plugin for [Payload CMS](https://payloadcms.com/) v3. Set a future publish date on any draft document and it goes live automatically — no manual publishing required.

The plugin enables Payload's built-in `schedulePublish` drafts feature on selected collections and globals, routes the resulting jobs through an isolated queue, and exposes a Bearer-token-protected endpoint that your cron job pings to drain the queue.

---

## AI Integration Prompt

> Copy and paste this prompt into your AI assistant (Cursor, Claude, etc.) to integrate the plugin into an existing Payload project.

```
I want to add scheduled publication to my Payload CMS v3 project using @focus-reactive/payload-plugin-schedule-publication.

## How it works

The plugin:
1. Enables `drafts.schedulePublish: true` on every collection/global you configure — this makes Payload
   show a "Schedule Publish" date-time picker in the admin sidebar.
2. Routes all `schedulePublish` jobs to an isolated queue (default: "scheduled-publish") so they don't
   interfere with other background jobs.
3. Registers a GET /api/scheduled-publish/run endpoint that, when hit by a cron, calls
   payload.jobs.run({ queue }) to process all due scheduled-publish jobs.
4. The endpoint requires an Authorization: Bearer <secret> header to prevent unauthorized triggers.

## Installation

pnpm add @focus-reactive/payload-plugin-schedule-publication

## Step 1 — Register the plugin in payload.config.ts

import { schedulePublicationPlugin } from '@focus-reactive/payload-plugin-schedule-publication'

// Inside buildConfig({ plugins: [...] })
schedulePublicationPlugin({
  collections: ['pages', 'posts'],  // slugs of collections to enable scheduled publishing on
  globals: ['site-settings'],       // slugs of globals to enable scheduled publishing on (optional)
  secret: process.env.CRON_SECRET!, // any env var you choose — must match the Bearer token your cron sends
})

## Step 2 — Set up a cron to trigger the endpoint

The endpoint GET /api/scheduled-publish/run must be called at least as often as your finest
scheduling granularity (e.g. every minute for minute-level precision).

Pass the secret as a Bearer token:
  Authorization: Bearer <your-secret>

### Vercel (vercel.json)

{
  "crons": [
    {
      "path": "/api/scheduled-publish/run",
      "schedule": "* * * * *"
    }
  ]
}

Note: Set CRON_SECRET in your Vercel project environment variables. Vercel automatically sends
this value in the Authorization header when triggering your cron. Pass it directly to the
plugin's secret option: secret: process.env.CRON_SECRET!

### Any HTTP client / external cron service

curl -X GET https://your-cms.com/api/scheduled-publish/run \
  -H "Authorization: Bearer YOUR_SECRET"

## Important notes

- collections and globals receive `versions.drafts.schedulePublish: true` automatically.
  If a collection already has a versions/drafts config it is preserved and merged.
- The queue option (default: "scheduled-publish") isolates schedule jobs. Change it only if
  you have a naming conflict with other queues.
- Never expose the secret in client-side code. Store it in an environment variable.
```

---

## How It Works

```
Editor sets "Schedule Publish" date in Payload Admin
              ↓
Payload creates a schedulePublish job in the jobs collection
              ↓
         [ queue: "scheduled-publish" ]
              ↓
Cron calls GET /api/scheduled-publish/run  (every minute)
              ↓
Plugin endpoint: payload.jobs.run({ queue: "scheduled-publish" })
              ↓
Due jobs are processed → documents are published
```

The plugin hooks into Payload's own `schedulePublish` task — it does not implement its own publish logic. It simply enables the feature on your chosen collections/globals, routes the jobs to a dedicated queue, and provides the HTTP trigger endpoint.

---

## Installation

```bash
pnpm add @focus-reactive/payload-plugin-schedule-publication
```

**Peer dependencies:** `payload ^3.0.0`

---

## Quick Start

### Step 1 — Register the plugin

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-schedule-publication";

export default buildConfig({
  plugins: [
    schedulePublicationPlugin({
      collections: ["pages"],
      secret: process.env.CRON_SECRET!,
    }),
  ],
});
```

The plugin injects into every configured collection and global:

- `versions.drafts.schedulePublish: true` — enables the "Schedule Publish" date picker in the admin sidebar
- All `schedulePublish` jobs are routed to the `"scheduled-publish"` queue via a `beforeChange` hook on the jobs collection

### Step 2 — Set up a cron

The endpoint `GET /api/scheduled-publish/run` must be called periodically (at least as often as your finest scheduling granularity). It processes all due jobs in the queue and returns `{ ok: true }`.

#### Vercel

Add a cron to `vercel.json` at the root of your project:

```json
{
  "crons": [
    {
      "path": "/api/scheduled-publish/run",
      "schedule": "* * * * *"
    }
  ]
}
```

Vercel automatically sends `CRON_SECRET` as `Authorization: Bearer $CRON_SECRET` when triggering crons. Set `CRON_SECRET` in your Vercel project settings and pass it directly to the plugin's `secret` option.

#### External cron / curl

```bash
curl -X GET https://your-cms.com/api/scheduled-publish/run \
  -H "Authorization: Bearer YOUR_SECRET"
```

#### Node.js (node-cron)

```ts
import cron from "node-cron";

cron.schedule("* * * * *", async () => {
  await fetch("http://localhost:3000/api/scheduled-publish/run", {
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET}`,
    },
  });
});
```

---

## Configuration Reference

```ts
interface SchedulePublicationPluginConfig {
  /**
   * Collection slugs to enable scheduled publishing for.
   * @example ['pages', 'posts']
   */
  collections?: string[];

  /**
   * Global slugs to enable scheduled publishing for.
   * @example ['site-settings']
   */
  globals?: string[];

  /**
   * Queue name to isolate schedulePublish jobs.
   * When set, jobs are routed to this queue and the /scheduled-publish/run
   * endpoint will only process this queue.
   * @default "scheduled-publish"
   */
  queue?: string;

  /**
   * Bearer token used to authenticate calls to the
   * GET /api/scheduled-publish/run endpoint.
   */
  secret: string;
}
```

### Options

| Option        | Type       | Required | Default               | Description                                        |
| ------------- | ---------- | -------- | --------------------- | -------------------------------------------------- |
| `collections` | `string[]` | No       | `[]`                  | Collection slugs to enable scheduled publishing on |
| `globals`     | `string[]` | No       | `[]`                  | Global slugs to enable scheduled publishing on     |
| `queue`       | `string`   | No       | `"scheduled-publish"` | Queue name for isolating scheduled publish jobs    |
| `secret`      | `string`   | **Yes**  | —                     | Bearer token required to call the run endpoint     |

---

## The Run Endpoint

`GET /api/scheduled-publish/run`

Triggers processing of all due jobs in the scheduled-publish queue.

**Authentication:** `Authorization: Bearer <secret>`

**Success response:**

```json
{ "ok": true }
```

**Error responses:**

```json
{ "error": "Unauthorized" }   // 401 — missing or wrong token
{ "error": "Internal server error" }  // 500 — jobs runner threw
```

---

## Environment Variables

The plugin's `secret` option accepts any environment variable — use whatever name fits your platform. On Vercel, the natural choice is `CRON_SECRET`, which Vercel automatically sends as the `Authorization: Bearer` header when triggering crons.

```ts
// On Vercel
secret: process.env.CRON_SECRET!;

// On any other platform
secret: process.env.MY_CRON_SECRET!;
```

---

## Versioning & Drafts Behaviour

The plugin calls `injectSchedulePublishToVersions` on each configured collection/global config:

- If the collection has no `versions` config → adds `{ drafts: { schedulePublish: true } }`
- If `versions` is `true` or has `drafts: true` → replaces `drafts` with `{ schedulePublish: true }`
- If `versions.drafts` is an object → merges `schedulePublish: true` into it, preserving other draft options (e.g. `autosave`)

Your existing versions/drafts configuration is never discarded.

---

## Exports Reference

| Import path                                           | Exports                                                        |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `@focus-reactive/payload-plugin-schedule-publication` | `schedulePublicationPlugin`, `SchedulePublicationPluginConfig` |
