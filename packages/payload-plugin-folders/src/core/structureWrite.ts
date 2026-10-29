import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { ResolvedOptions } from "../types.js";

type KeyedRow = { collection: string; id: number | string; kind: "folder" | "page" };

/**
 * Patches only the `version` columns named in `structure` on a page's latest version, never a
 * full version object, so no locale, array or block row of the draft is touched (spec section
 * 5.3). P-15 reuses it for `folder` and `structureRevision`.
 */
export const patchLatestVersionStructure = async (
  req: PayloadRequest,
  collection: string,
  id: number | string,
  structure: Record<string, unknown>,
  updatedAt: string
): Promise<void> => {
  const { payload } = req;
  const { docs } = await payload.db.findVersions({
    collection: toCollectionSlug(collection),
    limit: 1,
    pagination: false,
    req,
    select: { id: true },
    where: { and: [{ parent: { equals: id } }, { latest: { equals: true } }] },
  });
  const [latest] = docs as Array<{ id: number | string }>;
  if (!latest) {
    return;
  }

  await payload.db.updateVersion({
    collection: toCollectionSlug(collection),
    id: latest.id,
    req,
    returning: false,
    versionData: { updatedAt, version: structure },
  } as never);
};

/**
 * Writes one sibling's key at database level: no hooks, no version entry, no locale touched.
 * `updatedAt` is set by hand because the drizzle adapter drops an unset one from an update.
 */
export const writeOrderKey = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  row: KeyedRow,
  orderKey: string
): Promise<void> => {
  const { payload } = req;
  const updatedAt = new Date().toISOString();
  const collection = row.kind === "folder" ? options.folders.slug : row.collection;

  await payload.db.updateOne({
    collection: toCollectionSlug(collection),
    data: { orderKey, updatedAt },
    id: row.id,
    req,
    returning: false,
  });

  if (
    row.kind === "page" &&
    payload.collections[toCollectionSlug(row.collection)]?.config.versions
  ) {
    await patchLatestVersionStructure(req, row.collection, row.id, { orderKey }, updatedAt);
  }
};
