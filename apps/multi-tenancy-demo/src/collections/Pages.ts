import type { CollectionConfig } from "payload";

// A tenant-scoped content collection. The multi-tenant plugin adds a `tenant`
// field automatically (made visible in the admin via `debug: true`) and filters
// the list view by the currently selected tenant.
export const Pages: CollectionConfig = {
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "tenant"],
  },
  access: {
    read: () => true,
  },
  // Visual editing only enriches DRAFT reads, so the collection needs Payload
  // drafts enabled. The frontend reads published content by default and switches
  // to drafts under Next.js draft mode (see the /next/preview route).
  versions: {
    drafts: true,
  },
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      index: true,
      // Intentionally NOT globally unique: each tenant has its own `home`,
      // `products`, etc. Uniqueness is per-tenant — the same slug under a
      // different tenant is a different page, and a slug that only exists for
      // one tenant 404s under another. That isolation is the whole demo.
      admin: {
        description: "URL segment for /<tenant>/<slug>. Unique within a tenant, not globally.",
      },
    },
    {
      name: "tagline",
      type: "text",
      admin: {
        description: "Short hero subtitle shown under the page title.",
      },
    },
    {
      name: "content",
      type: "textarea",
    },
  ],
  slug: "pages",
};
