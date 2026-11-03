import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { ResolvedOptions } from "../types.js";

type KeyedRow = { collection: string; id: number | string; kind: "folder" | "page" };

/**
 * Whether the collection keeps a `latest` flag on its versions, which only drafts add. A collection
 * with versions but no drafts has no latest version to patch (`versions` alone is truthy for it).
 */
export const hasLatestVersion = (payload: PayloadRequest["payload"], collection: string): boolean =>
  Boolean(payload.collections[toCollectionSlug(collection)]?.config.versions?.drafts);

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
 *
 * A page's `structureRevision` goes up with its key, on the main row and the latest version. The
 * structure guard reads an incoming key at the stored revision as a deliberate edit, so without the
 * bump a version restore (which carries the key the page had before the rebalance) would be refused
 * instead of replaced by the stored structure.
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

  if (row.kind === "folder") {
    await payload.db.updateOne({
      collection: toCollectionSlug(collection),
      data: { orderKey, updatedAt },
      id: row.id,
      req,
      returning: false,
    });

    return;
  }

  const stored = (await payload.db.findOne({
    collection: toCollectionSlug(collection),
    req,
    select: { structureRevision: true },
    where: { id: { equals: row.id } },
  })) as { structureRevision?: number | null } | null;
  const structureRevision = (stored?.structureRevision ?? 0) + 1;

  await payload.db.updateOne({
    collection: toCollectionSlug(collection),
    data: { orderKey, structureRevision, updatedAt },
    id: row.id,
    req,
    returning: false,
  });

  if (hasLatestVersion(payload, row.collection)) {
    await patchLatestVersionStructure(
      req,
      row.collection,
      row.id,
      { orderKey, structureRevision },
      updatedAt
    );
  }
};
