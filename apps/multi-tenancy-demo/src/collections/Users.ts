import type { CollectionConfig } from "payload";

// The multi-tenant plugin adds a `tenants` array field to this auth collection,
// which drives the tenant selector in the admin panel and scopes access.
export const Users: CollectionConfig = {
  admin: {
    useAsTitle: "email",
  },
  auth: true,
  fields: [
    {
      name: "name",
      type: "text",
    },
  ],
  slug: "users",
};
