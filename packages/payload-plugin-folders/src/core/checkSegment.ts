import { APIError } from "payload";
import type { PayloadRequest } from "payload";

import type { FolderId, ItemRef } from "../types.js";
import { readFolderRecord } from "./folderRecords.js";
import { getLocaleCodes } from "./locales.js";
import { getResolvedOptions } from "./runtime.js";
import { SEGMENT_ERROR_MESSAGE, isValidSegment } from "./slugify.js";
import { findSegmentConflict, getPageDefaultLocale } from "./uniqueness.js";

export type SegmentCheck = { message?: string; ok: boolean };

/**
 * Whether `segment` is free in the folder `parent` (`null` is the site root), the answer the edit
 * view and the create dialogs show while someone types. It applies the rules of spec section 2.6
 * against every page, drafts included, because it backs the draft warning of decision 10: another
 * folder or page of that folder already at the path, the segment pattern, and at the site root the
 * segments the site itself uses. `exclude` is the item being edited, which never conflicts with
 * itself.
 *
 * Lookups go through `findSegmentConflict`, which matches pages with `buildSegmentWhere`, so a
 * page that only has the default locale's segment counts in the other locales.
 */
export const checkSegment = async (
  req: PayloadRequest,
  {
    exclude,
    locale,
    parent,
    segment,
  }: { exclude?: ItemRef; locale?: string; parent: FolderId | null; segment: string }
): Promise<SegmentCheck> => {
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

  if (!isValidSegment(segment, { atSiteRoot: parent === null })) {
    return { message: SEGMENT_ERROR_MESSAGE, ok: false };
  }
  if (parent === null && options.reservedRootSegments.includes(segment.toLowerCase())) {
    return { message: `/${segment} is used by the site itself`, ok: false };
  }

  const isFolderExcluded = exclude?.collection === options.folders.slug;
  const conflict = await findSegmentConflict({
    folder,
    locale: locale ?? getPageDefaultLocale(payload),
    options,
    publishedOnly: false,
    req,
    segment,
    self: exclude && !isFolderExcluded ? { collection: exclude.collection, id: exclude.id } : null,
    selfFolder: isFolderExcluded ? exclude.id : undefined,
  });
  if (conflict) {
    return {
      message: `${conflict.path} is already used by ${conflict.kind === "folder" ? "a folder" : conflict.title}`,
      ok: false,
    };
  }

  return { ok: true };
};
