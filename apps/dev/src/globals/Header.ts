import type { GlobalConfig } from "payload";

export const Header: GlobalConfig = {
  fields: [
    {
      name: "name",
      required: true,
      type: "text",
    },
  ],
  label: "Header",
  slug: "header",
};
