import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  access: {
    read: () => true,
  },
  fields: [
    {
      name: "alt",
      required: true,
      type: "text",
    },
    {
      name: "title",
      type: "text",
    },
  ],
  slug: "media",
  upload: true,
};
