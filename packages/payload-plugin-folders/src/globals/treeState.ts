import type { GlobalConfig } from "payload";

import { treeStateSlug } from "../constants.js";

/** `revision` changes with every structural write; `lockedAt` backs the tree lock (spec section 5.2). */
export const buildTreeStateGlobal = (): GlobalConfig => ({
  slug: treeStateSlug,
  admin: { hidden: true },
  fields: [
    { name: "revision", type: "number", defaultValue: 0 },
    { name: "lockedAt", type: "date" },
  ],
});
