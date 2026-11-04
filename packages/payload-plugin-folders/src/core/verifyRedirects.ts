import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { folderRedirectsSlug } from "../constants.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { relationIdOf } from "./relationId.js";
import { pageBatchSize } from "./verifyPages.js";

export type DanglingRedirect = {
  fromPath: string;
  id: FolderId;
  locale: string | null;
  target: ItemRef | null;
};

/** Ids per existence query, far below the bound-parameter limit of either adapter. */
const idChunkSize = 500;

const toTarget = (value: unknown): ItemRef | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const { relationTo, value: id } = value as { relationTo?: unknown; value?: unknown };
  const targetId = relationIdOf(id);

  return typeof relationTo === "string" && targetId !== null
    ? { collection: relationTo, id: targetId }
    : null;
};

/**
 * The ids that exist in `collection` out of `ids`; a trashed document counts as gone, because the
 * plugin deletes the rows that name a document it trashes. A collection the site no longer has
 * holds nothing.
 */
const findExistingIds = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  collection: string,
  ids: FolderId[]
): Promise<Set<string>> => {
  const config = req.payload.collections[toCollectionSlug(collection)]?.config;
  if (!config) {
    return new Set();
  }
  const isTrashable =
    collection === options.folders.slug ? options.folders.trash : Boolean(config.trash);
  const existing = new Set<string>();
  for (let start = 0; start < ids.length; start += idChunkSize) {
    const { docs } = (await req.payload.db.find({
      collection: toCollectionSlug(collection),
      pagination: false,
      req,
      select: (isTrashable ? { deletedAt: true } : { id: true }) as SelectType,
      where: { id: { in: ids.slice(start, start + idChunkSize) } },
    })) as unknown as { docs: Array<{ deletedAt?: unknown; id: FolderId }> };
    for (const doc of docs) {
      if (!doc.deletedAt) {
        existing.add(String(doc.id));
      }
    }
  }

  return existing;
};

/**
 * Spec section 5.9: the `folder-redirects` rows whose target no longer exists. The rows are read
 * in batches by id, and each batch's targets are looked up once per collection.
 */
export const readDanglingRedirects = async (
  req: PayloadRequest,
  options: ResolvedOptions
): Promise<DanglingRedirect[]> => {
  const dangling: DanglingRedirect[] = [];
  let lastId: FolderId | null = null;

  for (;;) {
    const { docs } = (await req.payload.db.find({
      collection: toCollectionSlug(folderRedirectsSlug),
      limit: pageBatchSize,
      pagination: false,
      req,
      select: { fromPath: true, locale: true, target: true } as SelectType,
      sort: "id",
      ...(lastId === null ? {} : { where: { id: { greater_than: lastId } } }),
    })) as unknown as {
      docs: Array<{ fromPath?: string; id: FolderId; locale?: string | null; target?: unknown }>;
    };
    if (docs.length === 0) {
      break;
    }
    lastId = docs.at(-1)?.id as FolderId;

    const rows = docs.map((doc) => ({ doc, target: toTarget(doc.target) }));
    const idsByCollection = new Map<string, FolderId[]>();
    for (const { target } of rows) {
      if (target) {
        idsByCollection.set(target.collection, [
          ...(idsByCollection.get(target.collection) ?? []),
          target.id,
        ]);
      }
    }
    const existing = new Map<string, Set<string>>();
    for (const [collection, ids] of idsByCollection) {
      existing.set(collection, await findExistingIds(req, options, collection, ids));
    }
    for (const { doc, target } of rows) {
      if (target && existing.get(target.collection)?.has(String(target.id))) {
        continue;
      }
      dangling.push({
        fromPath: doc.fromPath ?? "",
        id: doc.id,
        locale: doc.locale ?? null,
        // A row whose target is gone has none left to name; that is dangling as well.
        target,
      });
    }

    if (docs.length < pageBatchSize) {
      break;
    }
  }

  return dangling;
};
