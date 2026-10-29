import type { CollectionConfig } from "payload";

import { pageUpdateAccess } from "../access/roles.js";

export const Pages: CollectionConfig = {
  slug: "pages",
  access: { update: pageUpdateAccess },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", localized: true, required: true },
    { name: "slug", type: "text", localized: true },
    {
      name: "blocks",
      type: "blocks",
      blocks: [
        { slug: "hero", fields: [{ name: "heading", type: "text", localized: true }] },
        { slug: "content", fields: [{ name: "body", type: "textarea", localized: true }] },
      ],
    },
  ],
  versions: { drafts: { autosave: true } },
};
