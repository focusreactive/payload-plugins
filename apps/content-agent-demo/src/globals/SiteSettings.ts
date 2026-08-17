import type { GlobalConfig } from "payload";

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  access: { read: () => true },
  versions: { drafts: true },
  fields: [
    { name: "siteName", type: "text", localized: true, required: true },
    {
      name: "nav",
      type: "array",
      maxRows: 6,
      fields: [
        { name: "label", type: "text", localized: true, required: true },
        { name: "url", type: "text", required: true },
      ],
    },
  ],
};
