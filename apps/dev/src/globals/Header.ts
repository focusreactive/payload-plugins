import type { GlobalConfig } from "payload";

export const Header: GlobalConfig = {
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
    },
    // Relations below feed the relations-graph plugin's "where is this used?" demo:
    // a global as a reference source, a relation inside an array, and a polymorphic one.
    { name: "featured", relationTo: "articles", type: "relationship" },
    {
      fields: [
        { name: "label", type: "text" },
        { name: "link", relationTo: ["pages", "articles"], type: "relationship" },
      ],
      name: "nav",
      type: "array",
    },
  ],
  label: "Header",
  slug: "header",
};
