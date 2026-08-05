import type { CollectionConfig } from "payload";

export const Authors: CollectionConfig = {
  slug: "authors",
  access: { read: () => true },
  admin: { useAsTitle: "name", defaultColumns: ["name", "updatedAt"] },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "bio", type: "textarea", localized: true },
    { name: "avatar", type: "upload", relationTo: "media" },
  ],
};
