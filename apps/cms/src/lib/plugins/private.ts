import { contentReleasesPlugin } from "@fr-private/payload-plugin-releases";
import { visualEditingPlugin } from "@fr-private/payload-plugin-visual-editing";
import type { Plugin } from "payload";

// Plugins published to the private `@fr-private` npm scope. They are grouped
// here — instead of inline in `index.ts` — so `create-ideal-cms` can replace
// THIS FILE with an empty list when scaffolding a project for someone without
// access to that scope (see packages/create-ideal-cms/src/stubs.ts).
export const privatePlugins: Plugin[] = [
  visualEditingPlugin({
    adminBasePath: "/admin",
    skipCollections: [
      "users",
      "media",
      "categories",
      "authors",
      "testimonials",
      "header",
      "footer",
      "document-embeddings",
      "redirects",
      "presets",
      "comments",
      "comment-reads",
      "ab-experiments",
      "payload-mcp-api-keys",
    ],
    skipGlobals: ["site-settings"],
  }),

  contentReleasesPlugin({
    // Batch content publishing: group document changes into a release and
    // publish them together. Scoped to the same collections as our other
    // content plugins.
    enabledCollections: ["page", "posts"],
    // Scheduled releases are not wired up (no cron endpoint / schedulerSecret),
    // so disable the built-in setInterval poller — it is pointless here and
    // unreliable on serverless. Releases are published manually.
    schedulerInterval: false,
  }),
];
