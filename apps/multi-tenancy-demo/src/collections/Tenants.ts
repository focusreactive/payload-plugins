import type { CollectionConfig } from "payload";

// The tenants collection the multi-tenant plugin points at. Each document is one
// isolated tenant; scoped collections (e.g. pages) reference a tenant via the
// `tenant` field the plugin injects.
export const Tenants: CollectionConfig = {
  admin: {
    useAsTitle: "name",
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description: "Used in the frontend preview URL: /<slug>.",
      },
    },
  ],
  slug: "tenants",
};
