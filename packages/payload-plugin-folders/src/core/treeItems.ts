import type { PayloadRequest, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type {
  FolderId,
  ItemRef,
  ResolvedOptions,
  ResolvedPageCollection,
  TreeItem,
} from "../types.js";
import { getItemsAccess, getReadScope } from "./access.js";
import type { ReadScope } from "./access.js";
import { normalizeFolderReference, toFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import {
  getDefaultLocaleKey,
  getFallbackLocaleKey,
  getLocaleCodes,
  noLocaleKey,
} from "./locales.js";
import { pagePathIn } from "./pagePaths.js";
import { effectiveSegmentsOf } from "./pageRecords.js";
import { createNestedRequest } from "./nestedRequest.js";
import { readLatestStatuses, resolveTreeStatus } from "./status.js";
import { getPageDefaultLocale, pageDepthIn } from "./uniqueness.js";

/** Rows the tree reads per query are bounded by the caller; this caps what a client may ask for. */
export const maxTreePageSize = 1000;

/** A collection the tree reads: the folders, or one opted-in page collection. */
export type TreeSource = {
  collection: string;
  hasDrafts: boolean;
  kind: "folder" | "page";
  page: ResolvedPageCollection | null;
  /** The relationship that names the parent folder: `parent` on a folder, `folder` on a page. */
  parentField: "folder" | "parent";
  /** What the user may read: the tree endpoints run at database level, which checks no access. */
  scope: ReadScope;
};

/** A row read from a source, before it becomes a `TreeItem`. */
export type TreeRow = { doc: Record<string, unknown>; source: TreeSource };

/** The locale slots a request reads in. */
export type ViewLocale = {
  defaultFolderKey: string;
  defaultPageKey: string;
  folderKey: string;
  pageKey: string;
};

export const resolveViewLocale = (
  req: PayloadRequest,
  options: ResolvedOptions,
  requested: string | null | undefined
): ViewLocale => {
  const { payload } = req;
  const codes = getLocaleCodes(payload.config);
  const defaultPageKey = getPageDefaultLocale(payload);
  const locale = requested && codes.includes(requested) ? requested : defaultPageKey;

  return {
    defaultFolderKey: getDefaultLocaleKey(payload, options),
    defaultPageKey,
    folderKey: codes.length > 0 && options.localizeSegments ? locale : noLocaleKey,
    pageKey: codes.length > 0 ? locale : noLocaleKey,
  };
};

/** Folders first, then the page collections in the order the host listed them. */
export const buildSources = async (
  req: PayloadRequest,
  options: ResolvedOptions
): Promise<TreeSource[]> => {
  const { payload } = req;
  const nestedRequest = createNestedRequest(req);
  const sources: TreeSource[] = [];
  const entries = [
    { collection: options.folders.slug, kind: "folder" as const, page: null },
    ...Object.values(options.collections).map((page) => ({
      collection: page.slug,
      kind: "page" as const,
      page,
    })),
  ];
  for (const entry of entries) {
    sources.push({
      collection: entry.collection,
      hasDrafts: Boolean(
        payload.collections[toCollectionSlug(entry.collection)]?.config.versions?.drafts
      ),
      kind: entry.kind,
      page: entry.page,
      parentField: entry.kind === "folder" ? "parent" : "folder",
      scope: await getReadScope({ collection: entry.collection, nestedRequest, req }),
    });
  }

  return sources;
};

/** The conditions every tree read of a source starts with: read access, and no trashed row. */
export const sourceClauses = (req: PayloadRequest, source: TreeSource): Where[] => {
  const clauses: Where[] = [];
  if (source.scope.where) {
    clauses.push(source.scope.where);
  }
  if (req.payload.collections[toCollectionSlug(source.collection)]?.config.trash) {
    clauses.push({ deletedAt: { exists: false } });
  }

  return clauses;
};

/** The columns a page row needs to become a tree item; nothing else is read. */
export const pageSelect = (source: TreeSource): SelectType => {
  const { page } = source;

  return {
    ...(source.hasDrafts ? { _status: true } : {}),
    createdAt: true,
    folder: true,
    isFolderRoot: true,
    orderKey: true,
    pathSegment: true,
    structureRevision: true,
    ...(page ? { [page.titleField]: true } : {}),
    updatedAt: true,
  } as SelectType;
};

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

const pickLocalized = (value: unknown, key: string, defaultKey: string): string => {
  if (value && typeof value === "object") {
    const byLocale = value as Record<string, unknown>;

    return toText(byLocale[key]) || toText(byLocale[defaultKey]);
  }

  return toText(value);
};

const ownSegmentOf = (segments: unknown, key: string): string =>
  segments && typeof segments === "object"
    ? toText((segments as Record<string, unknown>)[key])
    : toText(segments);

export const toFolderId = (value: unknown): FolderId | null => normalizeFolderReference(value).id;

/** Reads folders by id, with every locale, subject to the user's read access. */
export const readFolders = async ({
  ids,
  req,
  source,
}: {
  ids: FolderId[];
  req: PayloadRequest;
  source: TreeSource;
}): Promise<Map<string, FolderRecord>> => {
  const records = new Map<string, FolderRecord>();
  if (ids.length === 0 || !source.scope.isAllowed) {
    return records;
  }
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(source.collection),
    locale: "all",
    pagination: false,
    req,
    where: { and: [{ id: { in: ids } }, ...sourceClauses(req, source)] },
  });
  for (const doc of docs as Array<Record<string, unknown>>) {
    const record = toFolderRecord(doc);
    records.set(String(record.id), record);
  }

  return records;
};

/**
 * Rows read per collection for the child counts before the counts switch to `count` queries. One
 * read of the children of every folder on the page costs one query per collection and serves the
 * common tree, but its cost grows with the children: 100 folders of 1,000 pages would read 100,000
 * rows. A read that reaches the limit is thrown away and that collection is counted per folder
 * instead, which transfers no rows.
 */
export const childCountReadLimit = 5000;

type ChildCount = { childCount: number; hasRootPage: boolean };

/** Counts one collection's children by reading them, or returns null when there are too many. */
const countByReading = async ({
  counts,
  folderIds,
  limit,
  req,
  source,
}: {
  counts: Map<string, ChildCount>;
  folderIds: FolderId[];
  limit: number;
  req: PayloadRequest;
  source: TreeSource;
}): Promise<boolean> => {
  const { docs } = await req.payload.db.find({
    collection: toCollectionSlug(source.collection),
    limit: limit + 1,
    locale: "all",
    pagination: false,
    req,
    select: (source.kind === "folder"
      ? { parent: true }
      : { folder: true, isFolderRoot: true }) as SelectType,
    where: {
      and: [{ [source.parentField]: { in: folderIds } }, ...sourceClauses(req, source)],
    },
  });
  if (docs.length > limit) {
    return false;
  }
  for (const doc of docs as Array<Record<string, unknown>>) {
    const parentId = toFolderId(doc[source.parentField]);
    const entry = parentId === null ? undefined : counts.get(String(parentId));
    if (entry) {
      entry.childCount += 1;
      entry.hasRootPage = entry.hasRootPage || Boolean(doc.isFolderRoot);
    }
  }

  return true;
};

/** Counts one collection's children with a `count` per folder, and finds the root pages in one read. */
const countByCounting = async ({
  counts,
  folderIds,
  req,
  source,
}: {
  counts: Map<string, ChildCount>;
  folderIds: FolderId[];
  req: PayloadRequest;
  source: TreeSource;
}): Promise<void> => {
  const collection = toCollectionSlug(source.collection);
  for (const folderId of folderIds) {
    const { totalDocs } = await req.payload.db.count({
      collection,
      req,
      where: {
        and: [{ [source.parentField]: { equals: folderId } }, ...sourceClauses(req, source)],
      },
    });
    const entry = counts.get(String(folderId));
    if (entry) {
      entry.childCount += totalDocs;
    }
  }
  if (source.kind !== "page") {
    return;
  }
  // At most one root page per folder, so this read is bounded by the number of folders.
  const { docs } = await req.payload.db.find({
    collection,
    locale: "all",
    pagination: false,
    req,
    select: { folder: true } as SelectType,
    where: {
      and: [
        { folder: { in: folderIds } },
        { isFolderRoot: { equals: true } },
        ...sourceClauses(req, source),
      ],
    },
  });
  for (const doc of docs as Array<Record<string, unknown>>) {
    const parentId = toFolderId(doc.folder);
    const entry = parentId === null ? undefined : counts.get(String(parentId));
    if (entry) {
      entry.hasRootPage = true;
    }
  }
};

/**
 * Subfolders and pages inside each folder, and whether a root page exists: one read per
 * collection, bounded by `limit` rows, and `count` per folder for a collection that exceeds it.
 */
const readChildCounts = async ({
  folderIds,
  limit,
  req,
  sources,
}: {
  folderIds: FolderId[];
  limit: number;
  req: PayloadRequest;
  sources: TreeSource[];
}): Promise<Map<string, ChildCount>> => {
  const counts = new Map<string, ChildCount>(
    folderIds.map((id) => [String(id), { childCount: 0, hasRootPage: false }])
  );
  if (folderIds.length === 0) {
    return counts;
  }

  for (const source of sources) {
    if (!source.scope.isAllowed) {
      continue;
    }
    const isCounted = await countByReading({ counts, folderIds, limit, req, source });
    if (!isCounted) {
      await countByCounting({ counts, folderIds, req, source });
    }
  }

  return counts;
};

const toFolderItem = ({
  access,
  counts,
  options,
  row,
  view,
}: {
  access: TreeItem["access"];
  counts: { childCount: number; hasRootPage: boolean } | undefined;
  options: ResolvedOptions;
  row: Record<string, unknown>;
  view: ViewLocale;
}): TreeItem => {
  const folder = toFolderRecord(row);
  const ownSlug = toText(folder.slug[view.folderKey]);
  const slug = ownSlug || toText(folder.slug[view.defaultFolderKey]);
  const path = folder.fullPath[view.folderKey] || folder.fullPath[view.defaultFolderKey] || "";

  return {
    access,
    allowedTypes: folder.allowedTypes,
    ancestorIds: folder.ancestorIds ?? "/",
    childCount: counts?.childCount ?? 0,
    collection: options.folders.slug,
    defaultType: folder.defaultType,
    depth: folder.depth ?? 0,
    fullPath: path,
    hasRootPage: counts?.hasRootPage ?? false,
    id: folder.id,
    kind: "folder",
    orderKey: folder.orderKey,
    parentId: folder.parent,
    slug: slug === "" ? null : slug,
    slugIsFallback: ownSlug === "" && slug !== "",
    structureRevision: folder.structureRevision,
    title:
      pickLocalized(folder.name, view.folderKey, view.defaultFolderKey) ||
      slug ||
      `Folder ${String(folder.id)}`,
    typesLockedBy: folder.typesLockedBy,
    updatedAt: toText(row.updatedAt),
  };
};

const toPageItem = ({
  access,
  fallbackKey,
  latestStatuses,
  options,
  parent,
  req,
  row,
  source,
  view,
}: {
  access: TreeItem["access"];
  fallbackKey: string | null;
  latestStatuses: Map<string, unknown>;
  options: ResolvedOptions;
  parent: FolderRecord | null;
  req: PayloadRequest;
  row: Record<string, unknown>;
  source: TreeSource;
  view: ViewLocale;
}): TreeItem => {
  const page = source.page as ResolvedPageCollection;
  const isFolderRoot = Boolean(row.isFolderRoot);
  const own = ownSegmentOf(row.pathSegment, view.pageKey);
  const segment = effectiveSegmentsOf(
    { segments: row.pathSegment },
    [view.pageKey],
    view.defaultPageKey
  )[view.pageKey];
  const id = row.id as FolderId;
  const parentId = toFolderId(row.folder);
  // The page sits in a folder this user cannot read (or that is gone): its path and depth are
  // unknown, and composing them as if it sat at the site root would invent a URL.
  const isFolderUnknown = parentId !== null && parent === null;

  return {
    access,
    ...(isFolderUnknown
      ? {}
      : { ancestorIds: parent ? `${parent.ancestorIds ?? "/"}${parent.id}/` : "/" }),
    collection: page.slug,
    depth: isFolderUnknown ? null : pageDepthIn(parent, isFolderRoot),
    fullPath: isFolderUnknown
      ? ""
      : (pagePathIn({
          folder: parent,
          isFolderRoot,
          key: view.pageKey,
          options,
          payload: req.payload,
          segment,
        }) ?? ""),
    id,
    isFolderRoot,
    kind: "page",
    orderKey: typeof row.orderKey === "string" ? row.orderKey : null,
    parentId,
    slug: segment === "" ? null : segment,
    slugIsFallback: own === "" && segment !== "",
    status: resolveTreeStatus({
      fallbackKey,
      hasDrafts: source.hasDrafts,
      key: view.pageKey,
      latestStatus: latestStatuses.get(`${page.slug}:${id}`),
      mainStatus: row._status,
    }),
    structureRevision: typeof row.structureRevision === "number" ? row.structureRevision : 0,
    title: pickLocalized(row[page.titleField], view.pageKey, view.defaultPageKey) || "Untitled",
    updatedAt: toText(row.updatedAt),
  };
};

/**
 * Turns rows into `TreeItem`s in the order given, with what a row needs beyond its own columns,
 * each from one query per collection and never one per row (spec section 10.2): the child counts
 * and root-page flags of the folders (one read of the subfolders, one per page collection), the
 * latest version status of the pages (one `findVersions` per collection with drafts), and the access
 * flags (the collection's access functions asked once, a `Where` answer matched with one query).
 *
 * `parents` holds the folder record of every page's folder, which a page path is composed from.
 */
export const buildTreeItems = async ({
  childCountLimit = childCountReadLimit,
  options,
  parents,
  req,
  rows,
  sources,
  view,
}: {
  /** Rows read per collection for child counts before they are counted instead. */
  childCountLimit?: number;
  options: ResolvedOptions;
  parents: Map<string, FolderRecord>;
  req: PayloadRequest;
  rows: TreeRow[];
  sources: TreeSource[];
  view: ViewLocale;
}): Promise<TreeItem[]> => {
  const fallbackKey = getFallbackLocaleKey(req.payload);
  const refs: ItemRef[] = rows.map(({ doc, source }) => ({
    collection: source.collection,
    id: doc.id as FolderId,
  }));
  const folderIds = rows
    .filter(({ source }) => source.kind === "folder")
    .map(({ doc }) => doc.id as FolderId);
  const counts = await readChildCounts({
    folderIds,
    limit: childCountLimit,
    req,
    sources,
  });

  const latestStatuses = new Map<string, unknown>();
  for (const source of sources) {
    if (source.kind !== "page" || !source.hasDrafts) {
      continue;
    }
    const ids = rows.filter((row) => row.source === source).map(({ doc }) => doc.id as FolderId);
    for (const [id, status] of await readLatestStatuses({
      collection: source.collection,
      ids,
      req,
    })) {
      latestStatuses.set(`${source.collection}:${id}`, status);
    }
  }

  const access = await getItemsAccess({ items: refs, req });
  const noAccess = { delete: false, publish: false, update: false };

  return rows.map(({ doc, source }) => {
    const key = `${source.collection}:${doc.id}`;
    const itemAccess = access.get(key) ?? noAccess;
    if (source.kind === "folder") {
      return toFolderItem({
        access: itemAccess,
        counts: counts.get(String(doc.id)),
        options,
        row: doc,
        view,
      });
    }
    const parentId = toFolderId(doc.folder);

    return toPageItem({
      access: itemAccess,
      fallbackKey,
      latestStatuses,
      options,
      parent: parentId === null ? null : (parents.get(String(parentId)) ?? null),
      req,
      row: doc,
      source,
      view,
    });
  });
};
