import { ValidationError } from "payload";
import type { CollectionAfterChangeHook } from "payload";

import { toCollectionSlug } from "../../collectionSlug.js";
import { readFolderRecord } from "../../core/folderRecords.js";
import { queueAfterPathChange } from "../../core/afterPathChange.js";
import { settlePageRedirects } from "../../core/pageRedirects.js";
import { getFallbackLocaleKey } from "../../core/locales.js";
import { liveLocaleKeysOf, readPageRow, popSnapshot, toSnapshot } from "../../core/pageRecords.js";
import type { PageRow, PageSnapshot } from "../../core/pageRecords.js";
import { bumpRevision } from "../../core/treeLock.js";
import {
  createSaveConflictDescriber,
  describeMissingSegment,
  findLocaleWithoutSegment,
  findRootPageConflict,
  findSegmentConflict,
  folderPathIn,
  getPageDefaultLocale,
  getPageLocaleKeys,
  queryLocaleOf,
} from "../../core/uniqueness.js";
import type {
  FolderId,
  PathChange,
  PathChangeReason,
  ResolvedOptions,
  ResolvedPageCollection,
} from "../../types.js";
import { isInternalWrite } from "../context.js";
import { settleTrashedPage } from "./deleteHooks.js";

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
  after: PageRow,
  overrideAccess: boolean
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
  const describeConflict = createSaveConflictDescriber({ overrideAccess, req });

  if (written.isFolderRoot) {
    const conflict = await findRootPageConflict({ folder, options, req, self });
    if (conflict) {
      const folderPath = folder ? folderPathIn(folder, defaultLocale, options, payload) : "/";
      problems.push({
        message: await describeConflict.rootPage(conflict, folderPath),
        path: "isFolderRoot",
      });
    }
  } else {
    // Every live locale needs a segment of its own or the default locale's live one. A page live
    // only in `de` with its own `de` segment is valid: `localizeStatus` leaves no `en` segment on
    // the main row then, which is not a missing one.
    const hasDrafts = Boolean(
      payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
    );
    const liveKeys = liveLocaleKeysOf(
      after.status,
      localeKeys,
      hasDrafts,
      getFallbackLocaleKey(payload)
    );
    const missingLocale = findLocaleWithoutSegment({
      defaultLocale,
      effective: written.effective,
      liveKeys,
    });
    if (missingLocale !== null) {
      problems.push({
        message: describeMissingSegment(missingLocale, defaultLocale),
        path: page.segmentField,
      });
    }
    for (const key of changedKeys) {
      const segment = written.effective[key];
      // A locale the page is not live in has no URL, so nothing there can clash.
      if (segment === "" || !liveKeys.includes(key)) {
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
          message: await describeConflict.segment(conflict),
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
 * Whether the save changed what the tree shows of the live page: its root flag, whether it is live
 * at all, or its effective path in any locale. A draft save over a published page leaves the main
 * row alone, so a title-only draft changes none of them and the revision stays where it was.
 */
const hasLiveUrlChanged = (
  req: Parameters<CollectionAfterChangeHook>[0]["req"],
  before: PageSnapshot,
  after: PageRow
): boolean => {
  const { payload } = req;
  const localeKeys = getPageLocaleKeys(payload);
  const written = toSnapshot(after, localeKeys, getPageDefaultLocale(payload));

  return (
    before.isFolderRoot !== written.isFolderRoot ||
    before.isPublished !== written.isPublished ||
    localeKeys.some((key) => before.effective[key] !== written.effective[key])
  );
};

/**
 * Sends the live path changes of a page save to `hooks.afterPathChange`, after the commit. A copy
 * made by the duplicate operation is skipped: it is meant to be a draft, and a status-per-locale
 * collection keeps the original's published locales on the copy for a moment before the duplicate
 * unpublishes them, which would report URLs that never went live.
 */
const reportPageChanges = async ({
  changes,
  options,
  reason,
  req,
}: {
  changes: PathChange[];
  options: ResolvedOptions;
  reason: PathChangeReason;
  req: Parameters<CollectionAfterChangeHook>[0]["req"];
}): Promise<void> => {
  if (req.context?.foldersDuplicate) {
    return;
  }
  await queueAfterPathChange({
    changes: changes.filter((change) => change.from !== null || change.to !== null),
    options,
    reason,
    req,
  });
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
  id: FolderId,
  overrideAccess: boolean
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
    await validateWrittenPage(page, options, req, id, before, after, overrideAccess);
  }
  const changes = await settlePageRedirects({ after, before, id, options, page, req });
  await reportPageChanges({
    changes,
    options,
    reason: before.isFolderRoot === after.isFolderRoot ? "publish" : "rootToggle",
    req,
  });
  if (hasLiveUrlChanged(req, before, after)) {
    // Inside the save's transaction and tree lock (the page's beforeOperation hook took it), so
    // other editors' trees see the new revision exactly when the new path becomes visible.
    await bumpRevision(req);
  }
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
    const changes = await settlePageRedirects({ after, before: null, id, options, page, req });
    await reportPageChanges({ changes, options, reason: "create", req });
  }
};

export const buildPageAfterChange =
  (page: ResolvedPageCollection, options: ResolvedOptions): CollectionAfterChangeHook =>
  async ({ data, doc, operation, overrideAccess, previousDoc, req }) => {
    if (isInternalWrite(req)) {
      return doc;
    }
    if (operation === "create") {
      await settleCreatedPage(page, options, req, doc);
      await bumpRevision(req);
    } else if (operation === "update") {
      const id = doc.id as FolderId;
      // `data`, not `doc`: a save that selects fields returns a `doc` without `deletedAt`.
      if (data?.deletedAt && !previousDoc?.deletedAt) {
        // Moved to the trash: nothing to validate, the page is gone from the tree.
        await settleTrashedPage({
          before: popSnapshot(req, page.slug, id),
          id,
          options,
          page,
          req,
        });
      } else {
        await checkWrittenPage(page, options, req, id, overrideAccess === true);
        if (previousDoc?.deletedAt && data?.deletedAt === null) {
          // Restored from the trash: the page is back in the tree.
          await bumpRevision(req);
        }
      }
    }

    return doc;
  };
