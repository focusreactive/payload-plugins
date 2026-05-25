import type { CollectionConfig } from "payload";

export const Users: CollectionConfig = {
  admin: {
    useAsTitle: "email",
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
