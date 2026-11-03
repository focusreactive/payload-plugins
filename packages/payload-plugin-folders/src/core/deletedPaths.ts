import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { PathChange, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { queueAfterPathChange } from "./afterPathChange.js";
import { readFolderRecord } from "./folderRecords.js";
import { getFallbackLocaleKey, noLocaleKey } from "./locales.js";
import { pagePathIn } from "./pagePaths.js";
import { isPublishedInLocale, toSnapshot } from "./pageRecords.js";
import type { PageRow, PageSnapshot } from "./pageRecords.js";
import { getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";

/** The snapshot of a stored page row, for `planDeletedPageChanges`. */
export const snapshotOfRow = (req: PayloadRequest, row: PageRow): PageSnapshot =>
  toSnapshot(row, getPageLocaleKeys(req.payload), getPageDefaultLocale(req.payload));

const toLocaleOrNull = (key: string): string | null => (key === noLocaleKey ? null : key);

/**
 * The URLs a deleted (or trashed) page takes down, one change per locale in which it was live (spec
 * section 4: "Deleting a folder's root page leaves the folder without one; the folder URL then
 * returns 404"). A root page's path is its folder's, so the loss of a folder URL reads as
 * `{ from: '/news', to: null }`. A page that was only a draft had no URL and reports nothing.
 *
 * Reads the folder, so it runs before a delete writes anything that changes it.
 */
export const planDeletedPageChanges = async ({
  id,
  options,
  page,
  req,
  snapshot,
}: {
  id: number | string;
  options: ResolvedOptions;
  page: ResolvedPageCollection;
  req: PayloadRequest;
  /** The page as it was before it went: a move to the trash can change its status on the way. */
  snapshot: PageSnapshot;
}): Promise<PathChange[]> => {
  const { payload } = req;
  const hasDrafts = Boolean(
    payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
  );
  const fallbackKey = getFallbackLocaleKey(payload);
  const localeKeys = getPageLocaleKeys(payload);
  const { effective } = snapshot;
  const folder =
    snapshot.folder === null ? null : await readFolderRecord(req, options, snapshot.folder);
  if (snapshot.folder !== null && !folder) {
    return [];
  }

  const changes: PathChange[] = [];
  for (const key of localeKeys) {
    if (!isPublishedInLocale(snapshot.status, key, hasDrafts, fallbackKey)) {
      continue;
    }
    const from = pagePathIn({
      folder,
      isFolderRoot: snapshot.isFolderRoot,
      key,
      options,
      payload,
      segment: effective[key],
    });
    if (from !== null) {
      changes.push({
        collection: page.slug,
        from,
        id,
        kind: "page",
        locale: toLocaleOrNull(key),
        published: true,
        to: null,
      });
    }
  }

  return changes;
};

/** A delete that runs many documents collects their changes here, so the host hears once. */
export const deleteChangesContextKey = "foldersDeleteChanges";

/**
 * Hands the changes of a delete to `hooks.afterPathChange` with reason `delete`, after the commit.
 * Inside the recursive delete the request carries a collector (`deleteChangesContextKey`) that the
 * core reports once for the whole batch; a delete from anywhere else reports its own.
 */
export const reportDeletedPaths = async ({
  changes,
  options,
  req,
}: {
  changes: PathChange[];
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<void> => {
  const collector = req.context?.[deleteChangesContextKey];
  if (Array.isArray(collector)) {
    collector.push(...changes);

    return;
  }
  await queueAfterPathChange({ changes, options, reason: "delete", req });
};
