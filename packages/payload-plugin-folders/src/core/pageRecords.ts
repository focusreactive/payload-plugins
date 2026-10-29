import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedPageCollection } from "../types.js";
import { normalizeFolderReference } from "./folderRecords.js";

const isPublishedStatus = (status: unknown): boolean =>
  status === "published" ||
  (Boolean(status) &&
    typeof status === "object" &&
    Object.values(status as Record<string, unknown>).includes("published"));

/**
 * Whether a page's main row is live in locale `key`: `_status` is one value, or one per locale when
 * it is localized. A collection without drafts has no status, and every row is live.
 */
export const isPublishedInLocale = (status: unknown, key: string, hasDrafts: boolean): boolean => {
  if (!hasDrafts) {
    return true;
  }
  if (status && typeof status === "object") {
    return (status as Record<string, unknown>)[key] === "published";
  }

  return status === "published";
};

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
  /** `_status` as stored: one value, or one per locale when it is localized. */
  status: unknown;
  structureRevision: number;
};

const pageRowSelect = (page: ResolvedPageCollection, hasDrafts: boolean): SelectType =>
  ({
    ...(hasDrafts ? { _status: true } : {}),
    folder: true,
    isFolderRoot: true,
    orderKey: true,
    [page.segmentField]: true,
    structureRevision: true,
  }) as SelectType;

const hasDraftsEnabled = (req: PayloadRequest, page: ResolvedPageCollection): boolean =>
  Boolean(req.payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts);

const toPageRow = (
  row: Record<string, unknown>,
  page: ResolvedPageCollection,
  hasDrafts: boolean
): PageRow => ({
  folder: normalizeFolderReference(row.folder).id,
  isFolderRoot: Boolean(row.isFolderRoot),
  isPublished: !hasDrafts || isPublishedStatus(row._status),
  orderKey: typeof row.orderKey === "string" ? row.orderKey : null,
  segments: row[page.segmentField],
  status: row._status,
  structureRevision: typeof row.structureRevision === "number" ? row.structureRevision : 0,
});

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
  const hasDrafts = hasDraftsEnabled(req, page);
  const row = (await req.payload.db.findOne({
    collection: toCollectionSlug(page.slug),
    locale: "all",
    req,
    select: pageRowSelect(page, hasDrafts),
    where: { id: { equals: id } },
  })) as Record<string, unknown> | null;

  return row ? toPageRow(row, page, hasDrafts) : null;
};

/** `readPageRow` for several pages of one collection in one query, keyed by the id as text. */
export const readPageRows = async (
  req: PayloadRequest,
  page: ResolvedPageCollection,
  ids: FolderId[]
): Promise<Map<string, PageRow>> => {
  const rows = new Map<string, PageRow>();
  if (ids.length === 0) {
    return rows;
  }
  const hasDrafts = hasDraftsEnabled(req, page);
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(page.slug),
    locale: "all",
    pagination: false,
    req,
    select: pageRowSelect(page, hasDrafts),
    where: { id: { in: ids } },
  });
  for (const doc of docs as Array<Record<string, unknown>>) {
    rows.set(String(doc.id), toPageRow(doc, page, hasDrafts));
  }

  return rows;
};

const toSegmentText = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * A page's effective segment per locale slot, the way `buildSegmentWhere` and `fullPath` read it:
 * its own segment, else the default locale's. A segment field that is not localized gives the one
 * value to every slot.
 */
export const effectiveSegmentsOf = (
  row: Pick<PageRow, "segments">,
  localeKeys: string[],
  defaultLocale: string
): Record<string, string> => {
  const { segments } = row;
  if (segments && typeof segments === "object" && !Array.isArray(segments)) {
    const own = segments as Record<string, unknown>;

    return Object.fromEntries(
      localeKeys.map((key) => [key, toSegmentText(own[key]) || toSegmentText(own[defaultLocale])])
    );
  }

  return Object.fromEntries(localeKeys.map((key) => [key, toSegmentText(segments)]));
};

/** What the post-write check compares a saved main row against. */
export type PageSnapshot = {
  effective: Record<string, string>;
  folder: FolderId | null;
  isFolderRoot: boolean;
  isPublished: boolean;
};

export const toSnapshot = (
  row: PageRow,
  localeKeys: string[],
  defaultLocale: string
): PageSnapshot => ({
  effective: effectiveSegmentsOf(row, localeKeys, defaultLocale),
  folder: row.folder,
  isFolderRoot: row.isFolderRoot,
  isPublished: row.isPublished,
});

// A stack per document being written. `beforeValidate` pushes and `afterChange` pops, so a host
// `afterChange` hook that re-saves the same page on the same request (a nested update runs its own
// push and pop first) leaves the outer save's snapshot where the outer `afterChange` will find it.
// The tree lock serialises writers, so the top of a stack is always the running write's own entry.
// A write that fails between the two hooks leaves its entry at the bottom, where later writes,
// which push and pop above it, never read it.
const snapshotsByPayload = new WeakMap<object, Map<string, PageSnapshot[]>>();

const snapshotKey = (collection: string, id: FolderId): string => `${collection}:${id}`;

export const pushSnapshot = (
  req: PayloadRequest,
  collection: string,
  id: FolderId,
  snapshot: PageSnapshot
): void => {
  let snapshots = snapshotsByPayload.get(req.payload);
  if (!snapshots) {
    snapshots = new Map();
    snapshotsByPayload.set(req.payload, snapshots);
  }
  const key = snapshotKey(collection, id);
  snapshots.set(key, [...(snapshots.get(key) ?? []), snapshot]);
};

/** Takes the newest snapshot of the document off its stack. */
export const popSnapshot = (
  req: PayloadRequest,
  collection: string,
  id: FolderId
): PageSnapshot | null => {
  const snapshots = snapshotsByPayload.get(req.payload);
  const key = snapshotKey(collection, id);
  const stack = snapshots?.get(key);
  const snapshot = stack?.at(-1) ?? null;
  if (stack && snapshots) {
    if (stack.length > 1) {
      snapshots.set(key, stack.slice(0, -1));
    } else {
      snapshots.delete(key);
    }
  }

  return snapshot;
};
