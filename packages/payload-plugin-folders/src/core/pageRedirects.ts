import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, PathChange, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { readFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import { getFallbackLocaleKey, noLocaleKey } from "./locales.js";
import { pagePathIn } from "./pagePaths.js";
import { effectiveSegmentsOf, isPublishedInLocale } from "./pageRecords.js";
import type { PageRow, PageSnapshot } from "./pageRecords.js";
import {
  planPageRedirectRows,
  settleRedirectRows,
  shouldWriteRedirects,
  takenPathsOf,
} from "./redirects.js";
import { getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";

const toLocaleOrNull = (key: string): string | null => (key === noLocaleKey ? null : key);

/**
 * Spec section 5.6 for a save that went through the page's own hooks (a publish, a change of the
 * slug or of the root flag, a create): compares what was live before with the row just written,
 * per locale, and then
 * - writes a page row for every locale that was live at one path and is live at another, and
 * - deletes the page rows of every path that locale now occupies.
 *
 * `before` is null for a create. A locale counts as live by decision 24: published itself, or
 * without a status of its own and served through the default locale's. Nothing is written for a
 * draft-only change, because `before` and `after` then describe the same main row, and that case
 * returns before it reads anything.
 *
 * Runs inside the save's transaction, after the uniqueness check, so a refused save leaves no row.
 */
export const settlePageRedirects = async ({
  after,
  before,
  id,
  options,
  page,
  req,
}: {
  after: PageRow;
  before: PageSnapshot | null;
  id: FolderId;
  options: ResolvedOptions;
  page: ResolvedPageCollection;
  req: PayloadRequest;
}): Promise<void> => {
  const isWritingRows = shouldWriteRedirects(req, options);
  if (!(isWritingRows || options.redirects.enabled)) {
    return;
  }
  const { payload } = req;
  const hasDrafts = Boolean(
    payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
  );
  const fallbackKey = getFallbackLocaleKey(payload);
  const localeKeys = getPageLocaleKeys(payload);
  const effectiveAfter = effectiveSegmentsOf(after, localeKeys, getPageDefaultLocale(payload));
  const isLiveAfter = (key: string): boolean =>
    isPublishedInLocale(after.status, key, hasDrafts, fallbackKey);
  const isLiveBefore = (key: string): boolean =>
    before !== null && isPublishedInLocale(before.status, key, hasDrafts, fallbackKey);
  const hasStructureChanged =
    before !== null &&
    (String(before.folder) !== String(after.folder) || before.isFolderRoot !== after.isFolderRoot);

  const changedKeys = localeKeys.filter(
    (key) =>
      isLiveAfter(key) &&
      (!isLiveBefore(key) || hasStructureChanged || before?.effective[key] !== effectiveAfter[key])
  );
  if (changedKeys.length === 0) {
    return;
  }

  const readFolder = (folderId: PageRow["folder"]): Promise<FolderRecord | null> =>
    folderId === null ? Promise.resolve(null) : readFolderRecord(req, options, folderId);
  const folderAfter = await readFolder(after.folder);
  if (after.folder !== null && !folderAfter) {
    return;
  }
  const folderBefore =
    before === null || !hasStructureChanged || String(before.folder) === String(after.folder)
      ? folderAfter
      : await readFolder(before.folder);

  const changes: PathChange[] = [];
  for (const key of changedKeys) {
    const to = pagePathIn({
      folder: folderAfter,
      isFolderRoot: after.isFolderRoot,
      key,
      options,
      payload,
      segment: effectiveAfter[key],
    });
    const from =
      before !== null && isLiveBefore(key)
        ? pagePathIn({
            folder: folderBefore,
            isFolderRoot: before.isFolderRoot,
            key,
            options,
            payload,
            segment: before.effective[key],
          })
        : null;
    changes.push({
      collection: page.slug,
      from: from === to ? null : from,
      id,
      kind: "page",
      locale: toLocaleOrNull(key),
      published: true,
      to,
    });
  }

  await settleRedirectRows({
    clear: takenPathsOf(changes),
    req,
    rows: isWritingRows ? planPageRedirectRows(changes) : [],
  });
};
