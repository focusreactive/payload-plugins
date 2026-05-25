import type { GlobalConfig } from "payload";

export const Header: GlobalConfig = {
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
  ],
  label: "Header",
  slug: "header",
};
