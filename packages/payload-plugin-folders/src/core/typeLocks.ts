import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { ResolvedOptions } from "../types.js";
import { normalizeDefaultType, sameTypes } from "./allowedTypes.js";
import type { FolderRecord } from "./folderRecords.js";
import { readFolderDescendants } from "./subtree.js";

/**
 * Whether saving `current` over `previous` changes what a type lock has to write: the lock went
 * on or off, or it stayed on and the types it hands down changed.
 */
export const describeTypeLockChange = (
  previous: FolderRecord,
  current: FolderRecord
): "none" | "propagate" | "release" => {
  if (current.lockSubfolderTypes) {
    return !previous.lockSubfolderTypes || !sameTypes(previous.allowedTypes, current.allowedTypes)
      ? "propagate"
      : "none";
  }

  return previous.lockSubfolderTypes ? "release" : "none";
};

/**
 * Spec section 2.3 and Storyblok 3.6: copies `locker.allowedTypes` to every folder below it, marks
 * them `typesLockedBy` the locker, and clears their own lock flag (a locked folder cannot lock
 * others). A row that already matches is not written.
 *
 * The write names only non-localized columns, so the drizzle adapter leaves every locale row of
 * `name`, `slug` and `fullPath` alone and no locale row is created or dropped.
 */
export const applyTypeLock = async ({
  locker,
  options,
  req,
}: {
  locker: FolderRecord;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<number> => {
  let written = 0;
  for (const folder of await readFolderDescendants(req, options, locker.id)) {
    const defaultType = normalizeDefaultType(locker.allowedTypes, folder.defaultType);
    const isCurrent =
      sameTypes(folder.allowedTypes, locker.allowedTypes) &&
      String(folder.typesLockedBy) === String(locker.id) &&
      !folder.lockSubfolderTypes &&
      folder.defaultType === defaultType;
    if (isCurrent) {
      continue;
    }
    await req.payload.db.updateOne({
      collection: toCollectionSlug(options.folders.slug),
      data: {
        allowedTypes: locker.allowedTypes,
        defaultType,
        lockSubfolderTypes: false,
        typesLockedBy: locker.id,
        updatedAt: new Date().toISOString(),
      },
      id: folder.id,
      req,
      returning: false,
    });
    written += 1;
  }

  return written;
};

/**
 * Unlocking clears `typesLockedBy` on the folders the locker locked. They keep the types they were
 * given, as Storyblok does, and can be edited again.
 */
export const releaseTypeLock = async ({
  locker,
  options,
  req,
}: {
  locker: FolderRecord;
  options: ResolvedOptions;
  req: PayloadRequest;
}): Promise<number> => {
  let written = 0;
  for (const folder of await readFolderDescendants(req, options, locker.id)) {
    if (String(folder.typesLockedBy) !== String(locker.id)) {
      continue;
    }
    await req.payload.db.updateOne({
      collection: toCollectionSlug(options.folders.slug),
      data: { typesLockedBy: null, updatedAt: new Date().toISOString() },
      id: folder.id,
      req,
      returning: false,
    });
    written += 1;
  }

  return written;
};
