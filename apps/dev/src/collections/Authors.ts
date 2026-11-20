import type { CollectionConfig } from "payload";

// Demo data model for the relations-graph plugin: Articles -> Authors / Categories / Media.
export const Authors: CollectionConfig = {
  slug: "authors",
  admin: {
    useAsTitle: "name",
  },
  fields: [
    { name: "name", required: true, type: "text" },
    { name: "avatar", relationTo: "media", type: "upload" },
    // Reverse side of `articles.authors` — no data of its own.
    { collection: "articles", name: "articles", on: "authors", type: "join" },
  ],
};
