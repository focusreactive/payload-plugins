import { ValidationError } from "payload";
import type { CollectionAfterChangeHook } from "payload";

import { readFolderRecord } from "../../core/folderRecords.js";
import { settlePageRedirects } from "../../core/pageRedirects.js";
import { readPageRow, popSnapshot, toSnapshot } from "../../core/pageRecords.js";
import type { PageRow, PageSnapshot } from "../../core/pageRecords.js";
import { bumpRevision } from "../../core/treeLock.js";
import {
  describeMissingSegment,
  describeRootPageConflict,
  describeSegmentConflict,
  findRootPageConflict,
  findSegmentConflict,
  folderPathIn,
  getPageDefaultLocale,
  getPageLocaleKeys,
  queryLocaleOf,
} from "../../core/uniqueness.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../../types.js";
import { isInternalWrite } from "../context.js";

type Problem = { locale?: string; message: string; path: string };

/**
 * Rules 1 to 3 of spec section 2.6, checked once more on the main row the save just wrote, inside
 * the same transaction and under the same tree lock; a thrown error rolls the save back.
 *
 * `beforeValidate` can only judge the data a save names. Several writes make other values live
 * without naming them: publishing every locale puts the latest draft's slugs on the main row, a
 * version restore writes every locale from the version (its hooks run in the default locale only),
 * and a scheduled publish or `localizeStatus` do the same. Comparing the written row with a
 * snapshot taken before the write catches all of them, whatever the route.
 *
 * Only what became live is checked: every locale whose effective segment changed, and every
 * locale when the page was not live before, its folder changed or its root flag flipped. A save
 * that leaves the main row alone (a draft over a published page) changes nothing and costs two
 * reads.
 */
const validateWrittenPage = async (
  page: ResolvedPageCollection,
  options: ResolvedOptions,
  req: Parameters<CollectionAfterChangeHook>[0]["req"],
  id: FolderId,
  before: PageSnapshot,
  after: PageRow
): Promise<void> => {
  const { payload } = req;
  const localeKeys = getPageLocaleKeys(payload);
  const defaultLocale = getPageDefaultLocale(payload);
  const written = toSnapshot(after, localeKeys, defaultLocale);
  const isWholePageNew =
    !before.isPublished ||
    String(before.folder) !== String(written.folder) ||
    before.isFolderRoot !== written.isFolderRoot;
  const changedKeys = localeKeys.filter(
    (key) => isWholePageNew || before.effective[key] !== written.effective[key]
  );
  if (changedKeys.length === 0) {
    return;
  }

  const folder =
    written.folder === null ? null : await readFolderRecord(req, options, written.folder);
  if (written.folder !== null && !folder) {
    return;
  }

  const self = { collection: page.slug, id };
  const problems: Problem[] = [];

  if (written.isFolderRoot) {
    const conflict = await findRootPageConflict({ folder, options, req, self });
    if (conflict) {
      const folderPath = folder ? folderPathIn(folder, defaultLocale, options, payload) : "/";
      problems.push({
        message: describeRootPageConflict(conflict, folderPath),
        path: "isFolderRoot",
      });
    }
  } else {
    if (written.effective[defaultLocale] === "") {
      problems.push({ message: describeMissingSegment(defaultLocale), path: page.segmentField });
    }
    for (const key of changedKeys) {
      const segment = written.effective[key];
      if (segment === "") {
        continue;
      }
      const conflict = await findSegmentConflict({
        folder,
        locale: key,
        options,
        publishedOnly: true,
        req,
        segment,
        self,
      });
      if (conflict) {
        problems.push({
          locale: queryLocaleOf(key),
          message: describeSegmentConflict(conflict),
          path: page.segmentField,
        });
      }
    }
  }

  if (problems.length > 0) {
    throw new ValidationError({ collection: page.slug, errors: problems, req });
  }
};

/**
 * Compares the snapshot taken before the write with the row it left: the uniqueness rules first
 * (a refusal rolls the save back), then the redirect rows of spec section 5.6, which a rolled-back
 * save must not leave.
 */
const checkWrittenPage = async (
  page: ResolvedPageCollection,
  options: ResolvedOptions,
  req: Parameters<CollectionAfterChangeHook>[0]["req"],
  id: FolderId
): Promise<void> => {
  const before = popSnapshot(req, page.slug, id);
  if (!before) {
    return;
  }
  const after = await readPageRow(req, page, id);
  if (!after) {
    return;
  }
  if (after.isPublished) {
    await validateWrittenPage(page, options, req, id, before, after);
  }
  await settlePageRedirects({ after, before, id, options, page, req });
};

/** A create is live at once unless it is a draft; its paths free the page rows that name them. */
const settleCreatedPage = async (
  page: ResolvedPageCollection,
  options: ResolvedOptions,
  req: Parameters<CollectionAfterChangeHook>[0]["req"],
  doc: Record<string, unknown>
): Promise<void> => {
  if (doc._status === "draft") {
    return;
  }
  const id = doc.id as FolderId;
  const after = await readPageRow(req, page, id);
  if (after?.isPublished) {
    await settlePageRedirects({ after, before: null, id, options, page, req });
  }
};

export const buildPageAfterChange =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionAfterChangeHook =>
  async ({ doc, operation, req }) => {
    if (isInternalWrite(req)) {
      return doc;
    }
    if (operation === "create") {
      await settleCreatedPage(page, options, req, doc);
      await bumpRevision(req);
    } else if (operation === "update") {
      await checkWrittenPage(page, options, req, doc.id as FolderId);
    }

    return doc;
  };
