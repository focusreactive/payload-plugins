import type { CollectionConfig } from "payload";

import { pageCreateAccess, pageDeleteAccess, pageUpdateAccess } from "../access/roles.js";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: { create: pageCreateAccess, delete: pageDeleteAccess, update: pageUpdateAccess },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text" },
    { name: "body", type: "textarea" },
  ],
};
