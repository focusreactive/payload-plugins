import type { CollectionAfterChangeHook } from "payload";

import { bumpRevision } from "../../core/treeLock.js";
import { isInternalWrite } from "../context.js";

export const pageAfterChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation === "create" && !isInternalWrite(req)) {
    await bumpRevision(req);
  }

  return doc;
};
