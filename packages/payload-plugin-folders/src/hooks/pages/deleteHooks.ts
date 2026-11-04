import { APIError } from "payload";
import type {
  CollectionAfterDeleteHook,
  CollectionBeforeDeleteHook,
  CollectionBeforeValidateHook,
} from "payload";

import {
  planDeletedPageChanges,
  reportDeletedPaths,
  snapshotOfRow,
} from "../../core/deletedPaths.js";
import { toCollectionSlug } from "../../collectionSlug.js";
import { readFolderRecord } from "../../core/folderRecords.js";
import { getDefaultLocaleKey } from "../../core/locales.js";
import { deleteCustomMirrorRowsTo } from "../../core/mirror.js";
import { readPageRow } from "../../core/pageRecords.js";
import type { PageSnapshot } from "../../core/pageRecords.js";
import { deleteRedirectsTargeting } from "../../core/redirects.js";
import { bumpRevision } from "../../core/treeLock.js";
import type { FolderId, PathChange, ResolvedOptions, ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

// The changes a page's `beforeDelete` worked out, until its `afterDelete` reports them: the page
// is gone by then, and so is what the paths were read from. They live on the request's context, so
// a delete that fails between the two hooks takes them along with its request.
const pendingChangesContextKey = "foldersPendingDeleteChanges";

const keyOf = (collection: string, id: FolderId): string => `${collection}:${id}`;

const isInTrash = async (
  req: Parameters<CollectionBeforeDeleteHook>[0]["req"],
  page: ResolvedPageCollection,
  id: FolderId
): Promise<boolean> => {
  const { config } = req.payload.collections[toCollectionSlug(page.slug)];
  if (!config.trash) {
    return false;
  }
  const stored = (await req.payload.db.findOne({
    collection: toCollectionSlug(page.slug),
    req,
    select: { deletedAt: true } as never,
    where: { id: { equals: id } },
  })) as { deletedAt?: string | null } | null;

  return Boolean(stored?.deletedAt);
};

/**
 * Spec sections 4 and 5.6 for a page that is deleted: its redirect rows go (a delete writes none),
 * the URLs it held are worked out while the page and its folder can still be read, and the custom-URL
 * mirror rows that point at those URLs go with them.
 */
export const buildPageBeforeDelete =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await deleteRedirectsTargeting({ ref: { collection: page.slug, id }, req });
    if (isInternalWrite(req)) {
      return;
    }
    // The trash step already reported these URLs and cleared the custom rows; a permanent delete
    // from the trash would report URLs the site stopped serving earlier, or, after a folder
    // rename, URLs that were never live.
    if (await isInTrash(req, page, id)) {
      return;
    }
    const row = await readPageRow(req, page, id);
    if (!row) {
      return;
    }
    const changes = await planDeletedPageChanges({
      id,
      options,
      page,
      req,
      snapshot: snapshotOfRow(req, row),
    });
    await deleteCustomMirrorRowsTo({ changes, options, req });
    const pending = (req.context[pendingChangesContextKey] ?? {}) as Record<string, PathChange[]>;
    pending[keyOf(page.slug, id)] = changes;
    req.context[pendingChangesContextKey] = pending;
  };

/**
 * Reports what `buildPageBeforeDelete` collected, with reason `delete`, once the delete commits,
 * and bumps the tree revision so other editors' trees refresh.
 */
export const buildPageAfterDelete =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionAfterDeleteHook =>
  async ({ id, req }) => {
    if (isInternalWrite(req)) {
      return;
    }
    const pending = req.context[pendingChangesContextKey] as
      | Record<string, PathChange[]>
      | undefined;
    const key = keyOf(page.slug, id);
    const changes = pending?.[key] ?? [];
    if (pending) {
      delete pending[key];
    }
    await reportDeletedPaths({ changes, options, req });
    await bumpRevision(req);
  };

/**
 * A page moved to the trash (`deletedAt` set by an update) goes through the same steps as a
 * delete: no redirect row may point at it, the URLs it held are reported with reason `delete`, and
 * the tree revision moves. Called from the page's `afterChange` once the save wrote `deletedAt`.
 */
export const settleTrashedPage = async ({
  before,
  id,
  options,
  page,
  req,
}: {
  /** The page as `beforeValidate` saw it, before the save changed anything. */
  before: PageSnapshot | null;
  id: FolderId;
  options: ResolvedOptions;
  page: ResolvedPageCollection;
  req: Parameters<CollectionBeforeDeleteHook>[0]["req"];
}): Promise<void> => {
  await deleteRedirectsTargeting({ ref: { collection: page.slug, id }, req });
  if (before) {
    const changes = await planDeletedPageChanges({ id, options, page, req, snapshot: before });
    await deleteCustomMirrorRowsTo({ changes, options, req });
    await reportDeletedPaths({ changes, options, req });
  }
  await bumpRevision(req);
};

/**
 * Spec section 7.10 (`R19`): a page cannot come back from the trash into a folder that is still in
 * it, because the page would sit in a folder nobody can open and at a path that does not resolve.
 */
export const buildPageRestoreGuard =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionBeforeValidateHook =>
  async ({ data, operation, originalDoc, req }) => {
    if (
      !data ||
      operation !== "update" ||
      isInternalWrite(req) ||
      data.deletedAt !== null ||
      !originalDoc?.deletedAt
    ) {
      return data;
    }
    const row = await readPageRow(req, page, originalDoc.id as FolderId);
    if (!row || row.folder === null) {
      return data;
    }
    const folder = await readFolderRecord(req, options, row.folder);
    if (folder?.storedRow.deletedAt) {
      const path = folder.fullPath[getDefaultLocaleKey(req.payload, options)] ?? "";
      throw new APIError(
        path ? `Restore its folder ${path} first` : "Restore its folder first",
        409,
        { reason: "folderTrashed" },
        true
      );
    }

    return data;
  };
