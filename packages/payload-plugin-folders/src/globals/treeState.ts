import type { Access, GlobalConfig } from "payload";

import { treeStateSlug } from "../constants.js";

const isLoggedIn: Access = ({ req }) => Boolean(req.user);
const nobody: Access = () => false;

/** `revision` changes with every structural write; `lockedAt` backs the tree lock (spec section 5.2). */
export const buildTreeStateGlobal = (): GlobalConfig => ({
  slug: treeStateSlug,
  // Only the plugin writes the lock, with overrideAccess: true.
  access: { read: isLoggedIn, update: nobody },
  admin: { hidden: true },
  fields: [
    { name: "revision", type: "number", defaultValue: 0 },
    { name: "lockedAt", type: "date" },
  ],
});
