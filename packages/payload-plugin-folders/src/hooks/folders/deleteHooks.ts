import { APIError } from "payload";
import type {
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
  PayloadRequest,
} from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
import { readFolderRecord } from "../../core/folderRecords.js";
import { getDefaultLocaleKey } from "../../core/locales.js";
import { deleteRedirectsTargeting } from "../../core/redirects.js";
import type { FolderId, ResolvedOptions } from "../../types.js";
import { isInternalWrite } from "../context.js";

export const notEmptyFolderMessage =
  "This folder is not empty. Delete its contents first, or delete it from the content tree.";

/** Rows directly inside a folder: subfolders and pages of every collection. */
const countChildren = async ({
  folderId,
  includeTrashed,
  options,
  req,
}: {
  folderId: FolderId;
  includeTrashed: boolean;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<number> => {
  const { payload } = req;
  let total = 0;
  const collections = [
    { field: "parent", slug: options.folders.slug },
    ...Object.values(options.collections).map((page) => ({ field: "folder", slug: page.slug })),
  ];
  for (const { field, slug } of collections) {
    const hasTrash = Boolean(payload.collections[toCollectionSlug(slug)]?.config.trash);
    const { totalDocs } = await payload.db.count({
      collection: toCollectionSlug(slug),
      req,
      where:
        hasTrash && !includeTrashed
          ? { and: [{ [field]: { equals: folderId } }, { deletedAt: { exists: false } }] }
          : { [field]: { equals: folderId } },
    });
    total += totalDocs;
  }

  return total;
};

/**
 * Spec sections 5.6 and 7.10: a folder is deleted empty. The recursive delete (`core/deleteItems.ts`)
 * removes its content first, so the folder is empty by then; a delete from anywhere else (the stock
 * REST delete, an API key script) of a folder that still holds anything is a 409 and removes
 * nothing, because the database would otherwise move its content to the top level. Trashed rows
 * count: they would surface at the top level too. The redirect rows that target the folder go with it.
 */
export const buildFolderBeforeDelete =
  (options: ResolvedOptions): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    if (!isInternalWrite(req)) {
      const children = await countChildren({ folderId: id, includeTrashed: true, options, req });
      if (children > 0) {
        throw new APIError(notEmptyFolderMessage, 409, { reason: "notEmpty" }, true);
      }
    }
    await deleteRedirectsTargeting({ ref: { collection: options.folders.slug, id }, req });
  };

/**
 * The trash counterpart of `buildFolderBeforeDelete`, for a save that sets `deletedAt` on a folder:
 * it must be empty of live rows (a trashed child is fine; it waits for its own restore). The other
 * way, a folder cannot leave the trash into a parent that is still in it.
 */
export const buildFolderTrashGuard =
  (options: ResolvedOptions): CollectionBeforeValidateHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (!data || operation !== "update" || isInternalWrite(req) || !originalDoc) {
      return data;
    }
    const id = originalDoc.id as FolderId;

    if (data.deletedAt && !originalDoc.deletedAt) {
      const children = await countChildren({ folderId: id, includeTrashed: false, options, req });
      if (children > 0) {
        throw new APIError(notEmptyFolderMessage, 409, { reason: "notEmpty" }, true);
      }

      return data;
    }

    if (data.deletedAt === null && originalDoc.deletedAt) {
      const stored = await readFolderRecord(req, options, id);
      const parent = stored?.parent ? await readFolderRecord(req, options, stored.parent) : null;
      if (parent?.storedRow.deletedAt) {
        const path = parent.fullPath[getDefaultLocaleKey(req.payload, options)] ?? "";
        throw new APIError(
          path ? `Restore its parent folder ${path} first` : "Restore its parent folder first",
          409,
          { reason: "folderTrashed" },
          true
        );
      }
    }

    return data;
  };
