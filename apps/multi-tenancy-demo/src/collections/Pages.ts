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
  fields: [
    {
      name: "title",
      type: "text",
      required: true,
    },
    {
      name: "content",
      type: "textarea",
    },
  ],
  slug: "pages",
};
