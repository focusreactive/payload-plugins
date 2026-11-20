import type { CollectionConfig } from "payload";

// Demo data model for the relations-graph plugin; `parent` is a self-reference.
export const Categories: CollectionConfig = {
  slug: "categories",
  admin: {
    useAsTitle: "title",
  },
  fields: [
    { name: "title", required: true, type: "text" },
    { name: "parent", relationTo: "categories", type: "relationship" },
  ],
};
