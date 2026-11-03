import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import type { FolderId, ItemRef } from "../types.js";
import { canReadItem } from "./access.js";
import { readFolderRecord } from "./folderRecords.js";
import { getLocaleCodes } from "./locales.js";
import { getResolvedOptions } from "./runtime.js";
import {
  describeHiddenRootPageConflict,
  describeRootPageConflict,
  findRootPageConflict,
  folderPathIn,
  getPageDefaultLocale,
} from "./uniqueness.js";

/** The page that already holds the folder's root page place, and the folder's path. */
/** `title` is left out when the reader may not read the page that holds the place. */
export type RootPageCheckConflict = { path: string; title?: string };

export type RootPageCheck = { conflict?: RootPageCheckConflict; message?: string; ok: boolean };

/**
 * Whether another page is, or is about to be, the root page of the folder `parent` (`null` is the
 * site root), for the edit view's draft warning (spec sections 2.6 and 4, decision 10). It reads
 * the same state `checkSegment` does: every page, drafts included, and the latest version of each
 * page in a collection with drafts. `exclude` is the page being edited, which never clashes with
 * itself.
 */
export const checkRootPage = async (
  req: PayloadRequest,
  { exclude, locale, parent }: { exclude?: ItemRef; locale?: string; parent: FolderId | null }
): Promise<RootPageCheck> => {
  const { payload } = req;
  const options = getResolvedOptions(payload);
  const codes = getLocaleCodes(payload.config);
  if (locale !== undefined && codes.length > 0 && !codes.includes(locale)) {
    throw new APIError(`"${locale}" is not a locale of this site`, 400, null, true);
  }
  const folder = parent === null ? null : await readFolderRecord(req, options, parent);
  if (parent !== null && !folder) {
    throw new APIError("This folder no longer exists", 404, null, true);
  }

  const conflict = await findRootPageConflict({
    folder,
    options,
    req,
    scope: "latest",
    self: exclude ? { collection: exclude.collection, id: exclude.id } : null,
  });
  if (!conflict) {
    return { ok: true };
  }
  const path = folder
    ? folderPathIn(folder, locale ?? getPageDefaultLocale(payload), options, payload) || "/"
    : "/";

  // The check looks at every page and at drafts, so the page it finds may be one the reader may
  // not see (a draft they have no read access to): then the answer says a place is taken and no more.
  const canReadConflict = await canReadItem({
    item: { collection: conflict.collection, id: conflict.id },
    req,
  });
  if (!canReadConflict) {
    return { conflict: { path }, message: describeHiddenRootPageConflict(path), ok: false };
  }

  return {
    conflict: { path, title: conflict.title },
    message: describeRootPageConflict(conflict, path),
    ok: false,
  };
};
