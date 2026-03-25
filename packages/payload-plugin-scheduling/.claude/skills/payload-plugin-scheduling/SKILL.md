---
name: payload-plugin-scheduling
description: >
  Use this skill for anything involving the payload-plugin-scheduling Payload CMS plugin.
  Triggers include: installing payload-plugin-scheduling, configuring its options, asking
  what it does, troubleshooting errors, upgrading versions, setting up cron jobs for it,
  and answering questions about its API. If the user mentions "payload-plugin-scheduling",
  "schedule publication", "scheduled publish", "scheduled publishing", or "schedule plugin"
  in any Payload CMS context, always use this skill.
---

# payload-plugin-scheduling

> Adds scheduled publication to Payload CMS v3. Set a future publish date on any draft document and it goes live automatically when a cron hits the run endpoint — no manual publishing required.

**Source**: [github.com/focusreactive/payload-plugins](https://github.com/focusreactive/payload-plugins)
**npm**: `@focus-reactive/payload-plugin-scheduling`
**Payload versions**: 3.x

---

## Quick Start

### 1. Installation

```bash
pnpm add @focus-reactive/payload-plugin-scheduling
# or
npm install @focus-reactive/payload-plugin-scheduling
```

**Peer dependencies:** `payload ^3.0.0`

### 2. Register the plugin

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";

export default buildConfig({
  plugins: [
    schedulePublicationPlugin({
      collections: ["pages", "posts"],
      globals: ["site-settings"], // optional
      secret: process.env.CRON_SECRET!,
    }),
  ],
});
```

### 3. Set up a cron

The endpoint `GET /api/scheduled-publish/run` must be called periodically (at least as often as your finest scheduling granularity).

#### Vercel (`vercel.json`)

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

Vercel automatically sends `CRON_SECRET` as `Authorization: Bearer $CRON_SECRET`. Set it in Vercel project settings and pass it to the plugin's `secret` option.

#### External cron / curl

```bash
curl -X GET https://your-cms.com/api/scheduled-publish/run \
  -H "Authorization: Bearer YOUR_SECRET"
```

#### node-cron

```ts
import cron from "node-cron";

cron.schedule("* * * * *", async () => {
  await fetch("http://localhost:3000/api/scheduled-publish/run", {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
});
```

---

## Configuration Reference

| Option        | Type       | Required | Default               | Description                                        |
| ------------- | ---------- | -------- | --------------------- | -------------------------------------------------- |
| `collections` | `string[]` | No       | `[]`                  | Collection slugs to enable scheduled publishing on |
| `globals`     | `string[]` | No       | `[]`                  | Global slugs to enable scheduled publishing on     |
| `queue`       | `string`   | No       | `"scheduled-publish"` | Queue name for isolating scheduled publish jobs    |
| `secret`      | `string`   | **Yes**  | —                     | Bearer token required to call the run endpoint     |

---

## What the Plugin Adds

1. **`versions.drafts.schedulePublish: true`** — injected into every configured collection and global, enabling the "Schedule Publish" date picker in the admin sidebar.
2. **Job queue routing** — all `schedulePublish` jobs are routed to the `"scheduled-publish"` queue via a `beforeChange` hook on the jobs collection.
3. **`GET /api/scheduled-publish/run` endpoint** — processes all due jobs in the queue. Requires `Authorization: Bearer <secret>`.

---

## Pitfalls

- **`secret` is required** — the plugin will not compile without it. Store it in an environment variable, never in client-side code.
- **No CSS, no import map step** — unlike some other plugins, this one adds no UI components that need stylesheet imports or import map regeneration.
- **No migration needed** — the plugin adds no new collections or tables; it only modifies collection/global config and registers a job queue + endpoint.
- **`collections`/`globals` slugs must match exactly** — the plugin logs a warning for unknown slugs at startup.
- **Cron frequency = scheduling precision** — if you call the endpoint every 5 minutes, documents can only go live on 5-minute boundaries.
- **`queue` option** — change only if there is a naming conflict with other Payload job queues in your project.

---

## Further Reading

- Working examples → `./examples.md`
