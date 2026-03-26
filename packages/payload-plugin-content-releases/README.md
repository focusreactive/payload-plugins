# @focus-reactive/payload-plugin-content-releases

Batch content publishing plugin for [Payload CMS](https://payloadcms.com/) v3. Group multiple document changes into a single release and publish them together -- manually or on a schedule.

The plugin creates two collections (`releases` and `release-items`), exposes REST endpoints for publishing and conflict detection, and optionally supports scheduled releases via a cron-triggered endpoint.

---

## Installation

```bash
bun add @focus-reactive/payload-plugin-content-releases
# or
pnpm add @focus-reactive/payload-plugin-content-releases
# or
npm install @focus-reactive/payload-plugin-content-releases
```

**Peer dependencies:** `payload ^3.0.0`

---

## Quick Start

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { contentReleasesPlugin } from "@focus-reactive/payload-plugin-content-releases";

export default buildConfig({
  plugins: [
    contentReleasesPlugin({
      enabledCollections: ["pages", "posts"],
      schedulerSecret: process.env.CRON_SECRET,
    }),
  ],
});
```

---

## Configuration Reference

| Option               | Type                       | Required | Default  | Description                                                                                      |
| -------------------- | -------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------ |
| `enabledCollections` | `string[]`                 | **Yes**  | --       | Collection slugs that can be added as release items                                              |
| `conflictStrategy`   | `"fail" \| "force"`        | No       | `"fail"` | How to handle documents modified after they were staged (see [Conflict Strategies](#conflict-strategies)) |
| `publishBatchSize`   | `number`                   | No       | `20`     | Number of items processed per batch during publish                                               |
| `useTransactions`    | `boolean`                  | No       | `true`   | Whether to use database transactions during publish                                              |
| `schedulerSecret`    | `string`                   | No       | --       | Bearer token for the `run-scheduled` endpoint. Omit to disable scheduled releases                |
| `access`             | `{ releases?, releaseItems? }` | No   | --       | Payload access control overrides for the generated collections (each accepts `create`, `read`, `update`, `delete`) |
| `hooks`              | `{ afterPublish?, onPublishError? }` | No | --    | Lifecycle hooks called after a release is published or when errors occur                         |

### Hooks

```ts
hooks: {
  afterPublish: async ({ releaseId, req }) => {
    // Called after a successful publish
  },
  onPublishError: async ({ releaseId, errors, req }) => {
    // Called when one or more items fail to publish
    // errors: Array<{ collection, docId, error }>
  },
}
```

---

## How It Works

The plugin adds two collections to your Payload config:

- **`releases`** -- groups of content changes with a name, description, status, and optional scheduled date.
- **`release-items`** -- individual document operations (publish or unpublish) linked to a release. Each item stores a snapshot of the document data and a `baseVersion` timestamp for conflict detection.

When a release is published, the plugin iterates through its items in batches, applies each snapshot to the target document, and tracks results. A rollback snapshot of previous document states is stored on the release for reference.

---

## Release Lifecycle

```
draft --> scheduled --> publishing --> published
                   \              \--> failed
                    \--> cancelled
```

| Status       | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `draft`      | Default state. Items can be added or removed.                |
| `scheduled`  | A `scheduledAt` date has been set. Awaiting cron trigger.    |
| `publishing` | Publish is in progress.                                      |
| `published`  | All items were published successfully.                       |
| `failed`     | One or more items failed. Check `errorLog` for details.      |
| `cancelled`  | Release was manually cancelled.                              |

Only `draft` releases can be published via the publish endpoint. Scheduled releases transition automatically when the cron fires.

---

## REST API Endpoints

### Publish a release

```
POST /api/content-releases/:id/publish
```

Publishes all items in a `draft` release. Returns the result summary.

**Success response:**

```json
{
  "ok": true,
  "status": "published",
  "published": 5,
  "failed": 0
}
```

**Failure response (partial):**

```json
{
  "ok": true,
  "status": "failed",
  "published": 3,
  "failed": 2,
  "errors": [
    { "itemId": "...", "collection": "pages", "docId": "...", "error": "Conflict: document modified since staging" }
  ]
}
```

### Check for conflicts

```
GET /api/content-releases/:id/conflicts
```

Returns a list of items whose target documents have been modified since they were staged.

```json
{
  "conflicts": [
    {
      "itemId": "...",
      "collection": "pages",
      "docId": "...",
      "reason": "Document was modified since staging. Expected version: ..., current: ..."
    }
  ],
  "total": 5
}
```

### Run scheduled releases

```
GET /api/content-releases/run-scheduled
```

Only registered when `schedulerSecret` is provided. Finds all releases with status `scheduled` and a `scheduledAt` date in the past, then publishes them.

**Authentication:** `Authorization: Bearer <schedulerSecret>`

**Response:**

```json
{
  "ok": true,
  "processed": 2,
  "results": [
    { "releaseId": "...", "status": "published", "published": 3, "failed": 0 },
    { "releaseId": "...", "status": "failed", "published": 1, "failed": 1 }
  ]
}
```

---

## Scheduled Publishing

To enable scheduled releases, provide `schedulerSecret` in the plugin config and set up a cron to call the `run-scheduled` endpoint.

### Vercel

```json
{
  "crons": [
    {
      "path": "/api/content-releases/run-scheduled",
      "schedule": "* * * * *"
    }
  ]
}
```

Set `CRON_SECRET` in your Vercel project settings. Vercel automatically sends it as `Authorization: Bearer $CRON_SECRET`.

### External cron / curl

```bash
curl -X GET https://your-cms.com/api/content-releases/run-scheduled \
  -H "Authorization: Bearer YOUR_SECRET"
```

---

## Conflict Strategies

When a release item is staged, the current `updatedAt` timestamp of the target document is stored as `baseVersion`. At publish time, the plugin compares this against the document's current `updatedAt`.

| Strategy | Behaviour                                                                 |
| -------- | ------------------------------------------------------------------------- |
| `fail`   | If the document was modified since staging, the item is skipped and marked as failed. This is the default. |
| `force`  | Conflicts are ignored. The staged snapshot overwrites the document regardless of intermediate changes.     |

Use the `/conflicts` endpoint to check for conflicts before publishing.

---

## Exports Reference

| Import path                                             | Exports                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `@focus-reactive/payload-plugin-content-releases`       | `contentReleasesPlugin`, `ContentReleasesPluginConfig`, `ReleaseStatus`, `ReleaseItemAction`, `ReleaseItemStatus`, `ConflictStrategy` |
