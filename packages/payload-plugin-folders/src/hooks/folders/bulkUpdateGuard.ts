import { APIError } from "payload";
import type { CollectionBeforeOperationHook } from "payload";

import { isInternalWrite } from "../context.js";

const subtreeFieldNames = ["slug", "allowedTypes", "lockSubfolderTypes"];

/**
 * A bulk update (`where` instead of an id) saves every matching folder and reports a failed one in
 * `errors` while the shared transaction commits anyway, so a rename or type lock that fails part
 * way through a folder's subtree would stay half written. A bulk update that names a field that
 * rewrites a subtree is refused; an update of other fields passes.
 */
export const folderBulkUpdateGuard: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== "update" || isInternalWrite(req)) {
    return args;
  }
  const bulk = args as { data?: Record<string, unknown>; id?: unknown; where?: unknown };
  if (bulk.id !== undefined || !bulk.where) {
    return args;
  }
  if (subtreeFieldNames.some((name) => name in (bulk.data ?? {}))) {
    throw new APIError(
      "Changing the slug or the page types of several folders at once is not supported. Update folders one at a time.",
      400
    );
  }

  return args;
};
