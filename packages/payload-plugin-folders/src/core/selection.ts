import type { PayloadRequest, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { toFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import { toPageRow } from "./pageRecords.js";
import type { PageRow } from "./pageRecords.js";
import { readFolderDescendants } from "./subtree.js";

export const itemKey = (ref: ItemRef): string => `${ref.collection}:${ref.id}`;

/** Ids per query, far below the bound-parameter limit of either adapter. */
const idChunkSize = 500;

const chunk = <TValue>(values: TValue[]): TValue[][] => {
  const chunks: TValue[][] = [];
  for (let index = 0; index < values.length; index += idChunkSize) {
    chunks.push(values.slice(index, index + idChunkSize));
  }

  return chunks;
};

export type SelectionPage = {
  collection: string;
  createdAt: string | null;
  id: FolderId;
  /** In the trash; only a selection read with `includeTrashed` holds such a page. */
  isTrashed: boolean;
  row: PageRow;
};

export type Selection = {
  /** Items that sit inside another selected folder: they go with that folder. */
  droppedItems: ItemRef[];
  /** Every selected folder and every folder below one, parents before children. */
  folders: FolderRecord[];
  /** Items that name a document that is gone (or trashed). */
  missing: ItemRef[];
  /** The selected pages, and every page inside a folder of `folders`. */
  pages: SelectionPage[];
  /** What the caller selected, in its order, without the dropped and the missing. */
  roots: ItemRef[];
};

const isTrashed = (row: Record<string, unknown>): boolean =>
  row.deletedAt !== undefined && row.deletedAt !== null;

const pageSelect = (req: PayloadRequest, collection: string, segmentField: string): SelectType => {
  const config = req.payload.collections[toCollectionSlug(collection)]?.config;
  const hasDrafts = Boolean(config?.versions?.drafts);

  return {
    ...(hasDrafts ? { _status: true } : {}),
    ...(config?.trash ? { deletedAt: true } : {}),
    createdAt: true,
    folder: true,
    isFolderRoot: true,
    orderKey: true,
    [segmentField]: true,
    structureRevision: true,
  } as SelectType;
};

/** Pages of one collection matching `where`, with every locale; trashed rows only with `includeTrashed`. */
export const readSelectionPages = async ({
  collection,
  includeTrashed = false,
  options,
  req,
  where,
}: {
  collection: string;
  includeTrashed?: boolean;
  options: ResolvedOptions;
  req: PayloadRequest;
  where: Where;
}): Promise<SelectionPage[]> => {
  const page = options.collections[collection];
  const config = req.payload.collections[toCollectionSlug(collection)]?.config;
  const hasDrafts = Boolean(config?.versions?.drafts);
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(collection),
    locale: "all",
    pagination: false,
    req,
    select: pageSelect(req, collection, page.segmentField),
    where:
      config?.trash && !includeTrashed ? { and: [where, { deletedAt: { exists: false } }] } : where,
  });

  return (docs as Array<Record<string, unknown>>)
    .filter((doc) => includeTrashed || !isTrashed(doc))
    .map((doc) => ({
      collection,
      createdAt: typeof doc.createdAt === "string" ? doc.createdAt : null,
      id: doc.id as FolderId,
      isTrashed: isTrashed(doc),
      row: toPageRow(doc, page, hasDrafts),
    }));
};

/**
 * The documents a selection stands for (spec sections 5.8 and 7.10): the selected pages, the
 * selected folders and everything beneath them. An item whose folder, or a folder above it, is also
 * selected is dropped, as a move drops it. Reads at database level and checks no access: callers
 * ask the access questions of their own operation about what this returns.
 *
 * Rows in the trash are left out, because a move, a copy or a publish has nothing to do with them.
 * A permanent delete reads with `includeTrashed`: a folder cannot be deleted while a trashed page
 * or folder still points at it, so what sits in the trash beneath it goes too.
 */
export const readSelection = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  items: ItemRef[],
  { includeTrashed = false }: { includeTrashed?: boolean } = {}
): Promise<Selection> => {
  const foldersSlug = options.folders.slug;
  const unique = items.filter(
    (item, index) => items.findIndex((other) => itemKey(other) === itemKey(item)) === index
  );
  const folderItems = unique.filter((item) => item.collection === foldersSlug);
  const folderRows = new Map<string, FolderRecord>();
  for (const ids of chunk(folderItems.map((item) => item.id))) {
    const { docs } = await req.payload.db.find({
      collection: toCollectionSlug(foldersSlug),
      locale: "all",
      pagination: false,
      req,
      where: { id: { in: ids } },
    });
    for (const doc of docs as Array<Record<string, unknown>>) {
      if (includeTrashed || !isTrashed(doc)) {
        const record = toFolderRecord(doc);
        folderRows.set(String(record.id), record);
      }
    }
  }

  const selectedFolderIds = new Set(folderRows.keys());
  const topFolders: FolderRecord[] = [];
  const droppedItems: ItemRef[] = [];
  const missing: ItemRef[] = [];
  for (const item of folderItems) {
    const record = folderRows.get(String(item.id));
    if (!record) {
      missing.push(item);
    } else if (
      (record.ancestorIds ?? "").split("/").some((id) => id !== "" && selectedFolderIds.has(id))
    ) {
      droppedItems.push(item);
    } else {
      topFolders.push(record);
    }
  }

  const folderById = new Map<string, FolderRecord>();
  for (const record of topFolders) {
    folderById.set(String(record.id), record);
    for (const descendant of await readFolderDescendants(req, options, record.id)) {
      if (includeTrashed || !isTrashed(descendant.storedRow)) {
        folderById.set(String(descendant.id), descendant);
      }
    }
  }
  const folders = [...folderById.values()].sort(
    (left, right) => (left.depth ?? 0) - (right.depth ?? 0)
  );
  const folderIds = folders.map((folder) => folder.id);

  const pagesByKey = new Map<string, SelectionPage>();
  for (const page of Object.values(options.collections)) {
    const selectedIds = unique
      .filter((item) => item.collection === page.slug)
      .map((item) => item.id);
    for (const ids of chunk(selectedIds)) {
      for (const found of await readSelectionPages({
        collection: page.slug,
        includeTrashed,
        options,
        req,
        where: { id: { in: ids } },
      })) {
        pagesByKey.set(itemKey(found), found);
      }
    }
    for (const ids of chunk(folderIds)) {
      for (const found of await readSelectionPages({
        collection: page.slug,
        includeTrashed,
        options,
        req,
        where: { folder: { in: ids } },
      })) {
        pagesByKey.set(itemKey(found), found);
      }
    }
  }

  const kept: ItemRef[] = [];
  for (const item of unique) {
    if (item.collection === foldersSlug) {
      if (topFolders.some((folder) => String(folder.id) === String(item.id))) {
        kept.push(item);
      }
      continue;
    }
    const found = pagesByKey.get(itemKey(item));
    if (!found) {
      missing.push(item);
    } else if (found.row.folder !== null && folderById.has(String(found.row.folder))) {
      // Inside a selected folder's subtree: it goes with the folder.
      droppedItems.push(item);
    } else {
      kept.push(item);
    }
  }

  return {
    droppedItems,
    folders,
    missing,
    pages: [...pagesByKey.values()],
    roots: kept,
  };
};
