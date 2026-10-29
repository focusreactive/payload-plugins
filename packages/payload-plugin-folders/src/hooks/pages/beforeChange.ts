import { ValidationError } from "payload";
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from "payload";

import { normalizeFolderReference, readFolderRecord } from "../../core/folderRecords.js";
import { keyForNewItem } from "../../core/orderKeys.js";
import { bumpRevision } from "../../core/treeLock.js";
import type { ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

/**
 * A create takes the top (or bottom) key of its folder under the tree lock and overwrites whatever
 * the caller sent: a client never chooses an order key (spec section 6).
 */
export const buildPageBeforeChange =
  (collectionSlug: string, options: ResolvedOptions): CollectionBeforeChangeHook =>
  async ({ data, operation, req }) => {
    if (operation !== "create" || isInternalWrite(req)) {
      return data;
    }

    const reference = normalizeFolderReference(data.folder);
    const folderExists =
      !reference.invalid &&
      (reference.id === null || (await readFolderRecord(req, options, reference.id)));
    if (!folderExists) {
      throw new ValidationError({
        collection: collectionSlug,
        errors: [
          {
            message:
              reference.id === null && reference.invalid
                ? "Use null for the top level of the tree: 0 is not a folder"
                : "The folder does not exist",
            path: "folder",
          },
        ],
        req,
      });
    }

    data.folder = reference.id as never;
    data.orderKey = await keyForNewItem(req, options, reference.id);

    return data;
  };

export const pageAfterChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation === "create" && !isInternalWrite(req)) {
    await bumpRevision(req);
  }

  return doc;
};
