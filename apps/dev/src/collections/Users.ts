import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  admin: {
    useAsTitle: "title",
  },
  auth: true,
  fields: [
    {
      name: "title",
      type: "text",
    },
  ],
  slug: "users",
};
