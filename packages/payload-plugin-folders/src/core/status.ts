import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, TreeStatus } from "../types.js";
import { isPublishedInLocale } from "./pageRecords.js";

/**
 * The tree status of a page in locale `key` (spec section 7.2): `live` for a collection without
 * drafts, else `draft` when the main row is not published there (decision 24 counts a locale
 * served through the fallback as published), `changed` when it is but the latest version is a
 * draft there, and `published` otherwise. A page with no version row is `published`.
 */
export const resolveTreeStatus = ({
  fallbackKey,
  hasDrafts,
  key,
  latestStatus,
  mainStatus,
}: {
  fallbackKey: string | null;
  hasDrafts: boolean;
  key: string;
  /** `_status` of the latest version, as stored; `undefined` when the page has none. */
  latestStatus: unknown;
  /** `_status` of the main row, as stored. */
  mainStatus: unknown;
}): TreeStatus => {
  if (!hasDrafts) {
    return "live";
  }
  if (!isPublishedInLocale(mainStatus, key, true, fallbackKey)) {
    return "draft";
  }
  if (latestStatus === undefined) {
    return "published";
  }

  return isPublishedInLocale(latestStatus, key, true, fallbackKey) ? "published" : "changed";
};

/**
 * The `_status` of the latest version of each page, in one query (`parent in [...]`, `latest`),
 * keyed by page id as text. Pages with no version are absent.
 */
export const readLatestStatuses = async ({
  collection,
  ids,
  req,
}: {
  collection: string;
  ids: FolderId[];
  req: PayloadRequest;
}): Promise<Map<string, unknown>> => {
  const statuses = new Map<string, unknown>();
  if (ids.length === 0) {
    return statuses;
  }
  const { docs } = await req.payload.db.findVersions({
    collection: toCollectionSlug(collection),
    locale: "all",
    pagination: false,
    req,
    select: { parent: true, version: { _status: true } } as never,
    where: { and: [{ parent: { in: ids } }, { latest: { equals: true } }] },
  });
  for (const doc of docs as unknown as Array<{
    parent: FolderId | { id: FolderId };
    version?: { _status?: unknown };
  }>) {
    const parent = typeof doc.parent === "object" ? doc.parent.id : doc.parent;
    statuses.set(String(parent), doc.version?._status);
  }

  return statuses;
};
