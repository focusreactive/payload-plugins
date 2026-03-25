# Examples

## Full Configuration

All options explicitly set.

```ts
// payload.config.ts
import { buildConfig } from "payload";
import { schedulePublicationPlugin } from "@focus-reactive/payload-plugin-scheduling";

export default buildConfig({
  plugins: [
    schedulePublicationPlugin({
      collections: ["pages", "posts"],
      globals: ["site-settings"],
      queue: "scheduled-publish", // default — only change if there's a naming conflict
      secret: process.env.CRON_SECRET!,
    }),
  ],
});
```

---

## Vercel Cron

`vercel.json` at project root — triggers the endpoint every minute.

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

Set `CRON_SECRET` in Vercel project environment variables. Vercel automatically passes it as `Authorization: Bearer $CRON_SECRET`.

---

## External Cron / GitHub Actions

Run on a schedule using a GitHub Actions workflow.

```yaml
# .github/workflows/scheduled-publish.yml
name: Scheduled Publish
on:
  schedule:
    - cron: "* * * * *"
jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger scheduled publish
        run: |
          curl -X GET ${{ secrets.CMS_URL }}/api/scheduled-publish/run \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## With Existing Drafts Config

The plugin preserves your existing draft options (e.g. `autosave`).

```ts
// Before adding the plugin, your collection might look like:
const Posts: CollectionConfig = {
  slug: "posts",
  versions: {
    drafts: {
      autosave: { interval: 800 },
    },
  },
  // ...
};

// After — autosave is preserved, schedulePublish is added automatically.
// No manual change to the collection config needed.
schedulePublicationPlugin({
  collections: ["posts"],
  secret: process.env.CRON_SECRET!,
});
```
