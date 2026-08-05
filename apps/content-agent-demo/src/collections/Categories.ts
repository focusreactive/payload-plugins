import type { CollectionConfig } from "payload";

export const Categories: CollectionConfig = {
  slug: "categories",
  access: { read: () => true },
  admin: { useAsTitle: "title", defaultColumns: ["title", "slug"] },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", required: true, index: true },
  ],
};
