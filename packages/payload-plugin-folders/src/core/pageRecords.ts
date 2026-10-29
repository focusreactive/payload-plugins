import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedPageCollection } from "../types.js";
import { normalizeFolderReference } from "./folderRecords.js";

const isPublishedStatus = (status: unknown): boolean =>
  status === "published" ||
  (Boolean(status) &&
    typeof status === "object" &&
    Object.values(status as Record<string, unknown>).includes("published"));

/** The columns of a page's main row the structure guard and the validation compare against. */
export type PageRow = {
  folder: FolderId | null;
  isFolderRoot: boolean;
  /**
   * Whether the main row is live: published in at least one locale, or a collection without
   * drafts. The main row of a page that was only ever saved as a draft holds that draft's values,
   * which are not at any URL yet.
   */
  isPublished: boolean;
  orderKey: string | null;
  /** The segment field as stored: a value per locale when it is localized, else the plain value. */
  segments: unknown;
  structureRevision: number;
};

/**
 * Reads a page's main row with every locale, selecting only what the plugin compares. The main
 * row, not the latest draft, is what the tree and the published URLs follow (spec section 3.3).
 * A missing `structureRevision` (a row from before the plugin) counts as 0.
 */
export const readPageRow = async (
  req: PayloadRequest,
  page: ResolvedPageCollection,
  id: FolderId
): Promise<PageRow | null> => {
  const hasDrafts = Boolean(
    req.payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
  );
  const row = (await req.payload.db.findOne({
    collection: toCollectionSlug(page.slug),
    locale: "all",
    req,
    select: {
      ...(hasDrafts ? { _status: true } : {}),
      folder: true,
      isFolderRoot: true,
      orderKey: true,
      [page.segmentField]: true,
      structureRevision: true,
    } as SelectType,
    where: { id: { equals: id } },
  })) as Record<string, unknown> | null;
  if (!row) {
    return null;
  }

  return {
    folder: normalizeFolderReference(row.folder).id,
    isFolderRoot: Boolean(row.isFolderRoot),
    isPublished: !hasDrafts || isPublishedStatus(row._status),
    orderKey: typeof row.orderKey === "string" ? row.orderKey : null,
    segments: row[page.segmentField],
    structureRevision: typeof row.structureRevision === "number" ? row.structureRevision : 0,
  };
};
