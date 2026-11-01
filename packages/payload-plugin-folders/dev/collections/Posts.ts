import type { CollectionConfig } from "payload";

import {
  pageDeleteAccess,
  unversionedCreateAccess,
  unversionedUpdateAccess,
} from "../access/roles.js";

export const Posts: CollectionConfig = {
  slug: "posts",
  access: {
    create: unversionedCreateAccess,
    delete: pageDeleteAccess,
    update: unversionedUpdateAccess,
  },
  admin: { useAsTitle: "title" },
  fields: [
    { name: "title", type: "text", required: true },
    { name: "slug", type: "text" },
    { name: "body", type: "textarea" },
  ],
};
