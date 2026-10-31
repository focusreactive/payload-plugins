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
import { readFolderRecord } from "../../core/folderRecords.js";
import { getDefaultLocaleKey } from "../../core/locales.js";
import { readPageRow } from "../../core/pageRecords.js";
import type { PageSnapshot } from "../../core/pageRecords.js";
import { deleteRedirectsTargeting } from "../../core/redirects.js";
import { bumpRevision } from "../../core/treeLock.js";
import type { FolderId, PathChange, ResolvedOptions, ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

// The changes a page's `beforeDelete` worked out, until its `afterDelete` reports them: the page
// is gone by then, and so is what the paths were read from.
const changesByPayload = new WeakMap<object, Map<string, PathChange[]>>();

const keyOf = (collection: string, id: FolderId): string => `${collection}:${id}`;

/**
 * Spec sections 4 and 5.6 for a page that is deleted: its redirect rows go (a delete writes none),
 * and the URLs it held are worked out while the page and its folder can still be read.
 */
export const buildPageBeforeDelete =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionBeforeDeleteHook =>
  async ({ id, req }) => {
    await deleteRedirectsTargeting({ ref: { collection: page.slug, id }, req });
    if (isInternalWrite(req)) {
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
    let byKey = changesByPayload.get(req.payload);
    if (!byKey) {
      byKey = new Map();
      changesByPayload.set(req.payload, byKey);
    }
    byKey.set(keyOf(page.slug, id), changes);
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
    const byKey = changesByPayload.get(req.payload);
    const key = keyOf(page.slug, id);
    const changes = byKey?.get(key) ?? [];
    byKey?.delete(key);
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
