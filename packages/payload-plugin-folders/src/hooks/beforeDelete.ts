import type { CollectionBeforeDeleteHook } from "payload";

import { deleteRedirectsTargeting } from "../core/redirects.js";

/**
 * Spec section 5.6: a delete writes no redirect and removes the rows that point at the deleted
 * document. It runs before the delete because the database drops a deleted document's relationship
 * rows itself, which would leave the rows with no target to match. It runs in the delete's own
 * transaction, so a failed delete keeps its rows.
 */
export const buildRedirectCleanupBeforeDelete =
  (collection: string): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await deleteRedirectsTargeting({ ref: { collection, id }, req });
  };
