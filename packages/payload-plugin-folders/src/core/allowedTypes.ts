import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { readFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";

/** Whether a folder accepts pages of `collection`. A folder with no allowed types accepts all. */
export const isTypeAllowed = (
  folder: Pick<FolderRecord, "allowedTypes"> | null,
  collection: string
): boolean =>
  !folder || folder.allowedTypes.length === 0 || folder.allowedTypes.includes(collection);

const joinLabels = (labels: string[]): string =>
  labels.length < 2 ? (labels[0] ?? "") : `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;

/** Spec section 7.7: `/blog/2026 accepts only Article pages`. */
export const describeAllowedTypes = (
  folderPath: string,
  allowedTypes: readonly string[],
  options: ResolvedOptions
): string =>
  `${folderPath} accepts only ${joinLabels(
    allowedTypes.map((type) => options.collections[type]?.label ?? type)
  )} pages`;

export const sameTypes = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((type) => right.includes(type));

/**
 * The folder whose lock governs the types of a new child of `parent`: the lock that reached the
 * parent from above, else the parent's own lock. Spec section 2.3 and Storyblok 3.6.
 */
export const lockSourceOf = (parent: FolderRecord | null): FolderId | null => {
  if (!parent) {
    return null;
  }
  if (parent.typesLockedBy !== null) {
    return parent.typesLockedBy;
  }

  return parent.lockSubfolderTypes ? parent.id : null;
};

/**
 * Storyblok 3.9: a single allowed type is also the default. With several, a default that left the
 * list is dropped; with none (all types), the default is the author's choice.
 */
export const normalizeDefaultType = (
  allowedTypes: readonly string[],
  defaultType: string | null
): string | null => {
  if (allowedTypes.length === 1) {
    return allowedTypes[0];
  }
  if (allowedTypes.length > 1 && defaultType !== null && !allowedTypes.includes(defaultType)) {
    return null;
  }

  return defaultType;
};

export type FolderTypeProblem = {
  message: string;
  path: "allowedTypes" | "defaultType" | "lockSubfolderTypes";
};

export type FolderTypesPlan = {
  allowedTypes: string[];
  defaultType: string | null;
  lockSubfolderTypes: boolean;
  problems: FolderTypeProblem[];
  typesLockedBy: FolderId | null;
};

type PlanFolderTypesArgs = {
  /** The values the save names; `undefined` when it leaves the field out. */
  incoming: {
    allowedTypes?: unknown;
    defaultType?: unknown;
    lockSubfolderTypes?: unknown;
  };
  /** What to say when the folder is locked: the locking folder's path, for the message. */
  lockedByPath?: string;
  /** The folder the save lands in; `null` at the top of the tree. */
  parent: FolderRecord | null;
  /** The folder as stored; `null` on create. */
  stored: FolderRecord | null;
};

const toTypeList = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((type): type is string => typeof type === "string")
    : value === null
      ? []
      : undefined;

const toDefaultType = (value: unknown): string | null | undefined =>
  typeof value === "string" ? value : value === null ? null : undefined;

/**
 * The type settings a folder save results in (spec sections 2.3 and 5.4):
 * - a folder under a lock takes its types from the lock and refuses edits of them;
 * - a new subfolder of a locked folder inherits the lock;
 * - a single allowed type becomes the default type, and a default outside the list is refused;
 * - locking subfolders needs specific types, as Storyblok offers it only then.
 */
export const planFolderTypes = ({
  incoming,
  lockedByPath,
  parent,
  stored,
}: PlanFolderTypesArgs): FolderTypesPlan => {
  const problems: FolderTypeProblem[] = [];
  const incomingTypes = toTypeList(incoming.allowedTypes);
  const incomingDefault = toDefaultType(incoming.defaultType);
  const incomingLock =
    typeof incoming.lockSubfolderTypes === "boolean" ? incoming.lockSubfolderTypes : undefined;

  const inheritedFrom = stored ? stored.typesLockedBy : lockSourceOf(parent);
  const lockedMessage = `The page types of this folder are locked by ${lockedByPath ?? "a parent folder"}`;

  let allowedTypes: string[];
  let lockSubfolderTypes: boolean;
  let typesLockedBy: FolderId | null;

  if (inheritedFrom !== null) {
    // The lock owns the types of every folder below it, so what the save names is only checked.
    allowedTypes = stored ? stored.allowedTypes : (parent?.allowedTypes ?? []);
    typesLockedBy = inheritedFrom;
    lockSubfolderTypes = false;
    if (incomingTypes !== undefined && !sameTypes(incomingTypes, allowedTypes)) {
      problems.push({ message: lockedMessage, path: "allowedTypes" });
    }
    if (incomingLock === true) {
      problems.push({ message: lockedMessage, path: "lockSubfolderTypes" });
    }
  } else {
    allowedTypes = incomingTypes ?? stored?.allowedTypes ?? [];
    lockSubfolderTypes = incomingLock ?? stored?.lockSubfolderTypes ?? false;
    typesLockedBy = null;
    if (lockSubfolderTypes && allowedTypes.length === 0) {
      problems.push({
        message: "Choose specific page types before locking the types of subfolders",
        path: "lockSubfolderTypes",
      });
    }
  }

  const requestedDefault =
    incomingDefault === undefined ? (stored?.defaultType ?? null) : incomingDefault;
  // Payload fills the stored default into an update, so only a default that differs from the
  // stored one is a request; a stored default that left the list is dropped by the normalisation.
  if (
    incomingDefault !== undefined &&
    incomingDefault !== null &&
    incomingDefault !== (stored?.defaultType ?? null) &&
    allowedTypes.length > 0 &&
    !allowedTypes.includes(incomingDefault)
  ) {
    problems.push({
      message: "The default type must be one of the allowed types",
      path: "defaultType",
    });
  }

  return {
    allowedTypes,
    defaultType: normalizeDefaultType(allowedTypes, requestedDefault),
    lockSubfolderTypes,
    problems,
    typesLockedBy,
  };
};

export type DisallowedPage = ItemRef & {
  /** The moved folder the page sits in, or `null` when the page itself was selected. */
  insideFolder: FolderId | null;
};

export type AllowedTypesCheck = {
  /** Pages of each collection the target refuses, counted over everything that would move. */
  disallowedCounts: Record<string, number>;
  /** True when the target accepts everything that would move. */
  isAllowed: boolean;
  /** Up to `sampleLimit` refused pages, to name in a block or warning. */
  samples: DisallowedPage[];
};

export const allowedTypesSampleLimit = 20;

/**
 * Whether `target` accepts every page in `items` (spec section 5.4): the selected pages, and every
 * page inside a selected folder or any of its subfolders. `target` is a folder id, or `null` for the
 * top of the tree, which accepts everything. The target's stored `allowedTypes` already carry a
 * lock inherited from above, so no other folder is read. Folders in `items` only contribute their
 * pages: their own `allowedTypes` are replaced by a lock or stay as they are.
 *
 * Takes `req` and `options` in a third argument because pages inside a moved folder are found in
 * the database. Meant for the move planner (P-14), which blocks on the result, or warns when
 * `enforceAllowedTypesOnMove` is off.
 */
export const checkAllowedTypes = async (
  target: FolderId | null,
  items: ItemRef[],
  { options, req }: { options: ResolvedOptions; req: PayloadRequest }
): Promise<AllowedTypesCheck> => {
  const result: AllowedTypesCheck = { disallowedCounts: {}, isAllowed: true, samples: [] };
  if (target === null) {
    return result;
  }
  const targetFolder = await readFolderRecord(req, options, target);
  if (!targetFolder || targetFolder.allowedTypes.length === 0) {
    return result;
  }

  const { payload } = req;
  const foldersSlug = options.folders.slug;
  const refusedCollections = Object.keys(options.collections).filter(
    (collection) => !isTypeAllowed(targetFolder, collection)
  );
  const record = (collection: string, id: FolderId, insideFolder: FolderId | null) => {
    result.isAllowed = false;
    result.disallowedCounts[collection] = (result.disallowedCounts[collection] ?? 0) + 1;
    if (result.samples.length < allowedTypesSampleLimit) {
      result.samples.push({ collection, id, insideFolder });
    }
  };

  const movedFolderIds: FolderId[] = [];
  for (const item of items) {
    if (item.collection === foldersSlug) {
      movedFolderIds.push(item.id);
    } else if (refusedCollections.includes(item.collection)) {
      record(item.collection, item.id, null);
    }
  }

  for (const folderId of movedFolderIds) {
    const subtree = (await payload.db.find({
      collection: toCollectionSlug(foldersSlug),
      pagination: false,
      req,
      select: { id: true },
      where: {
        or: [{ id: { equals: folderId } }, { ancestorIds: { contains: `/${folderId}/` } }],
      },
    })) as { docs: Array<{ id: FolderId }> };
    const subtreeIds = subtree.docs.map((folder) => folder.id);
    if (subtreeIds.length === 0) {
      continue;
    }

    for (const collection of refusedCollections) {
      const where = { folder: { in: subtreeIds } };
      const { totalDocs } = await payload.db.count({
        collection: toCollectionSlug(collection),
        req,
        where,
      });
      if (totalDocs === 0) {
        continue;
      }
      result.isAllowed = false;
      result.disallowedCounts[collection] = (result.disallowedCounts[collection] ?? 0) + totalDocs;
      const room = allowedTypesSampleLimit - result.samples.length;
      if (room > 0) {
        const { docs } = (await payload.db.find({
          collection: toCollectionSlug(collection),
          limit: room,
          req,
          select: { id: true },
          where,
        })) as { docs: Array<{ id: FolderId }> };
        for (const page of docs.slice(0, room)) {
          result.samples.push({ collection, id: page.id, insideFolder: folderId });
        }
      }
    }
  }

  return result;
};
