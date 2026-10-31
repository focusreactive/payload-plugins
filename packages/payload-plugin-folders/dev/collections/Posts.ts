import type { CollectionConfig } from "payload";

import { pageUpdateAccess } from "../access/roles.js";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: { update: pageUpdateAccess },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text" },
    { name: "body", type: "textarea" },
  ],
};
