import { ValidationError } from "payload";
import type { PayloadRequest, SelectType } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, PathChange, ResolvedOptions } from "../types.js";
import { planFolderPaths, toFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import {
  getDefaultLocaleKey,
  getFolderLocaleKeys,
  noLocaleKey,
  withoutEmptyValues,
} from "./locales.js";
import { effectiveSegmentsOf, isPublishedInLocale } from "./pageRecords.js";
import { joinPath } from "./paths.js";
import { writeFolderPrefixRedirects } from "./redirects.js";
import type { FolderPrefixRedirect } from "./redirects.js";
import { folderPathIn, getPageDefaultLocale, getPageLocaleKeys } from "./uniqueness.js";

const descendantsWhere = (folderId: FolderId) => ({
  ancestorIds: { contains: `/${folderId}/` },
});

/**
 * Every folder below `folderId`, parents before children, read with every locale and no fallback.
 * `ancestorIds` is slash-delimited, so `/12/` never matches `/112/`.
 */
export const readFolderDescendants = async (
  req: PayloadRequest,
  options: ResolvedOptions,
  folderId: FolderId
): Promise<FolderRecord[]> => {
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(options.folders.slug),
    locale: "all",
    pagination: false,
    req,
    sort: "depth",
    where: descendantsWhere(folderId),
  });

  return (docs as Array<Record<string, unknown>>).map(toFolderRecord);
};

/**
 * Refuses a save that would rewrite more folder rows than `limits.maxFoldersPerMove` (spec
 * section 5.4), counting the folder itself. Runs before anything is written, so the refusal
 * is a plain validation error.
 */
export const assertSubtreeWithinLimit = async ({
  action,
  folderId,
  options,
  path,
  req,
}: {
  action: "rename" | "type lock";
  folderId: FolderId;
  options: ResolvedOptions;
  path: string;
  req: PayloadRequest;
}): Promise<void> => {
  const { totalDocs } = await req.payload.db.count({
    collection: toCollectionSlug(options.folders.slug),
    req,
    where: descendantsWhere(folderId),
  });
  const rows = totalDocs + 1;
  if (rows > options.limits.maxFoldersPerMove) {
    throw new ValidationError({
      collection: options.folders.slug,
      errors: [
        {
          message: `This ${action} would rewrite ${rows} folders; the limit is ${options.limits.maxFoldersPerMove}`,
          path,
        },
      ],
      req,
    });
  }
};

// A stack per folder being saved: `beforeChange` pushes the row as stored, `afterChange` pops it.
// The tree lock serialises writers, and a save that fails between the two hooks leaves its entry at
// the bottom, where later saves, which push and pop above it, never read it.
const snapshotsByPayload = new WeakMap<object, Map<string, FolderRecord[]>>();

export const pushFolderSnapshot = (req: PayloadRequest, record: FolderRecord): void => {
  let snapshots = snapshotsByPayload.get(req.payload);
  if (!snapshots) {
    snapshots = new Map();
    snapshotsByPayload.set(req.payload, snapshots);
  }
  const key = String(record.id);
  snapshots.set(key, [...(snapshots.get(key) ?? []), record]);
};

export const popFolderSnapshot = (req: PayloadRequest, id: FolderId): FolderRecord | null => {
  const snapshots = snapshotsByPayload.get(req.payload);
  const key = String(id);
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

const toLocaleOrNull = (key: string): string | null => (key === noLocaleKey ? null : key);

const isValuesObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

/**
 * Writes a folder row at database level, carrying the whole row as the read returned it. The
 * drizzle adapter deletes a document's locale rows and re-inserts the ones in `data`, so a write
 * that named only `name`, `slug` and `fullPath` would wipe any other localized field a host added
 * through `folders.overrides`. Locales that hold no value are left out of a localized field, so a
 * write never creates a locale row the folder did not have; only `fullPath` may add one, for a
 * locale whose path differs from what a fallback read would return.
 *
 * `fullPath` is a value per locale when folder fields are localized, and the plain text of the one
 * slot (`noLocaleKey`) when they are not.
 */
export const writeFolderRow = async ({
  ancestorIds,
  depth,
  fullPath,
  options,
  record,
  req,
}: {
  ancestorIds: string;
  depth: number;
  fullPath: Record<string, string>;
  options: ResolvedOptions;
  record: FolderRecord;
  req: PayloadRequest;
}): Promise<void> => {
  const { payload } = req;
  const localizedNames = new Set(
    (payload.collections[toCollectionSlug(options.folders.slug)]?.config.flattenedFields ?? [])
      .filter((field) => field.localized)
      .map((field) => field.name)
  );
  const data: Record<string, unknown> = Object.fromEntries(
    Object.entries(record.storedRow).flatMap(([name, value]): Array<[string, unknown]> => {
      if (name === "id" || name === "createdAt") {
        return [];
      }
      if (!(localizedNames.has(name) && isValuesObject(value))) {
        return [[name, value]];
      }
      const present = Object.fromEntries(
        Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined)
      );

      return Object.keys(present).length === 0 ? [] : [[name, present]];
    })
  );

  data.ancestorIds = ancestorIds;
  data.depth = depth;
  data.fullPath = options.localizeSegments ? withoutEmptyValues(fullPath) : fullPath[noLocaleKey];
  data.updatedAt = new Date().toISOString();

  await payload.db.updateOne({
    collection: toCollectionSlug(options.folders.slug),
    data,
    id: record.id,
    req,
    returning: false,
  });
};

/**
 * The full paths of the pages inside the rewritten folders, before and after. One read per page
 * collection with every locale; a page's path is its folder's path plus its own segment (or the
 * folder's path alone for a root page), so nothing is written for it.
 */
const findPageChanges = async ({
  currentById,
  options,
  previousById,
  req,
}: {
  currentById: Map<string, FolderRecord>;
  options: ResolvedOptions;
  previousById: Map<string, FolderRecord>;
  req: PayloadRequest;
}): Promise<PathChange[]> => {
  const { payload } = req;
  const pageKeys = getPageLocaleKeys(payload);
  const defaultLocale = getPageDefaultLocale(payload);
  const folderIds = [...currentById.values()].map((folder) => folder.id);
  const changes: PathChange[] = [];

  const pathOf = (
    folder: FolderRecord,
    key: string,
    segment: string,
    isFolderRoot: boolean
  ): string | null => {
    const folderPath = folderPathIn(folder, key, options, payload);
    if (folderPath === "") {
      return null;
    }
    if (isFolderRoot) {
      return folderPath;
    }

    return segment === "" ? null : joinPath(folderPath, segment);
  };

  for (const page of Object.values(options.collections)) {
    const hasDrafts = Boolean(
      payload.collections[toCollectionSlug(page.slug)]?.config.versions?.drafts
    );
    const { docs } = (await payload.db.find({
      collection: toCollectionSlug(page.slug),
      locale: "all",
      pagination: false,
      req,
      select: {
        ...(hasDrafts ? { _status: true } : {}),
        folder: true,
        isFolderRoot: true,
        pathSegment: true,
      } as SelectType,
      where: { folder: { in: folderIds } },
    })) as unknown as { docs: Array<Record<string, unknown>> };

    for (const row of docs) {
      const folderId =
        typeof row.folder === "object" && row.folder
          ? (row.folder as { id: FolderId }).id
          : (row.folder as FolderId);
      const previous = previousById.get(String(folderId));
      const current = currentById.get(String(folderId));
      if (!previous || !current) {
        continue;
      }
      const segments = effectiveSegmentsOf({ segments: row.pathSegment }, pageKeys, defaultLocale);
      const isFolderRoot = Boolean(row.isFolderRoot);
      for (const key of pageKeys) {
        const from = pathOf(previous, key, segments[key], isFolderRoot);
        const to = pathOf(current, key, segments[key], isFolderRoot);
        if (from !== to) {
          changes.push({
            collection: page.slug,
            from,
            id: row.id as FolderId,
            kind: "page",
            locale: toLocaleOrNull(key),
            published: isPublishedInLocale(row._status, key, hasDrafts),
            to,
          });
        }
      }
    }
  }

  return changes;
};

export type SubtreeRewrite = {
  /** Every full path that changed: the folder, its subfolders and the pages under them. */
  changes: PathChange[];
  /** Folder rows written, not counting the root, which the caller saved. */
  rewrittenFolders: number;
};

/**
 * Spec section 5.2 step 6 for a rename: the folder `root` already holds its new paths, and this
 * rewrites every descendant's `ancestorIds`, `depth` and `fullPath` to follow, then lists the
 * changed URLs (pages included) for `hooks.afterPathChange`. Call it inside the write's
 * transaction, under the tree lock.
 *
 * Folders are unversioned, so each row is one `payload.db.updateOne`. The drizzle adapter deletes
 * a row's locale rows and inserts the ones in `data`, so a write carries every locale's `name`,
 * `slug` and `fullPath` (decision 3), plus every other localized field the row has: a rename in one
 * locale must not drop or create a locale row for another. Page paths are computed from the folder path, so no page row
 * is written; the pages are read once per collection to report them.
 */
export const rewriteFolderSubtree = async ({
  options,
  previousRoot,
  req,
  root,
}: {
  options: ResolvedOptions;
  /** The root as it was stored before the save. */
  previousRoot: FolderRecord;
  req: PayloadRequest;
  /** The root as saved, with `fullPath` complete in every locale. */
  root: FolderRecord;
}): Promise<SubtreeRewrite> => {
  const { payload } = req;
  const keys = getFolderLocaleKeys(payload, options);
  const defaultKey = getDefaultLocaleKey(payload, options);
  const foldersSlug = options.folders.slug;

  const descendants = await readFolderDescendants(req, options, root.id);
  if (descendants.length + 1 > options.limits.maxFoldersPerMove) {
    throw new ValidationError({
      collection: foldersSlug,
      errors: [
        {
          message: `This rename would rewrite ${descendants.length + 1} folders; the limit is ${options.limits.maxFoldersPerMove}`,
          path: "slug",
        },
      ],
      req,
    });
  }

  const effectivePath = (folder: FolderRecord, key: string): string =>
    folder.fullPath[key] || folder.fullPath[defaultKey] || "";
  const previousById = new Map<string, FolderRecord>([
    [String(root.id), previousRoot],
    ...descendants.map((folder): [string, FolderRecord] => [String(folder.id), folder]),
  ]);
  const currentById = new Map<string, FolderRecord>([[String(root.id), root]]);
  const changes: PathChange[] = [];

  const recordFolderChanges = (previous: FolderRecord, current: FolderRecord): void => {
    for (const key of keys) {
      const from = effectivePath(previous, key);
      const to = effectivePath(current, key);
      if (from !== to) {
        changes.push({
          collection: foldersSlug,
          from: from === "" ? null : from,
          id: current.id,
          kind: "folder",
          locale: toLocaleOrNull(key),
          published: true,
          to: to === "" ? null : to,
        });
      }
    }
  };
  recordFolderChanges(previousRoot, root);

  let rewrittenFolders = 0;
  for (const descendant of descendants) {
    const parent = currentById.get(String(descendant.parent));
    if (!parent) {
      throw new Error(
        `Folder ${descendant.id} lists ${root.id} as an ancestor but its parent is not in that subtree; run the tree repair`
      );
    }
    const plan = planFolderPaths({
      defaultLocaleKey: defaultKey,
      keys,
      parent,
      slug: descendant.slug,
    });
    // A locale is written when its row already holds a path, or when its path differs from the
    // default locale's, which is what a fallback read would return. A locale that would only
    // repeat the fallback gets no row.
    const writtenKeys = keys.filter(
      (key) =>
        plan.fullPath[key] !== "" &&
        (key === defaultKey ||
          Boolean(descendant.fullPath[key]) ||
          plan.fullPath[key] !== plan.fullPath[defaultKey])
    );
    const writtenPaths = Object.fromEntries(writtenKeys.map((key) => [key, plan.fullPath[key]]));
    const isStale =
      descendant.ancestorIds !== plan.ancestorIds ||
      descendant.depth !== plan.depth ||
      writtenKeys.some((key) => (descendant.fullPath[key] ?? "") !== plan.fullPath[key]);

    // Only what is written counts as stored, so the reported path is the one a read returns.
    const current: FolderRecord = {
      ...descendant,
      ancestorIds: plan.ancestorIds,
      depth: plan.depth,
      fullPath: writtenPaths,
    };
    currentById.set(String(descendant.id), current);
    recordFolderChanges(descendant, current);

    if (isStale) {
      await writeFolderRow({
        ancestorIds: plan.ancestorIds,
        depth: plan.depth,
        fullPath: writtenPaths,
        options,
        record: descendant,
        req,
      });
      rewrittenFolders += 1;
    }
  }

  const redirects: FolderPrefixRedirect[] = changes
    .filter((change) => change.kind === "folder" && change.id === root.id && change.from !== null)
    .map((change) => ({
      folder: root.id,
      fromPath: change.from as string,
      locale: change.locale,
    }));
  await writeFolderPrefixRedirects({ options, redirects, req });

  changes.push(...(await findPageChanges({ currentById, options, previousById, req })));

  return { changes, rewrittenFolders };
};
