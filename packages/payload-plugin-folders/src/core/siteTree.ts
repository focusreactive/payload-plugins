import type { Payload, SelectType, Where } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import type { FolderId, ResolvedOptions, ResolvedPageCollection } from "../types.js";
import { livePathsByLocale } from "./alternates.js";
import { toFolderRecord } from "./folderRecords.js";
import type { FolderRecord } from "./folderRecords.js";
import { getDefaultLocaleKey, getLocaleCodes, noLocaleKey } from "./locales.js";
import { compareSiblings } from "./orderKeys.js";
import { formatPath } from "./paths.js";
import { relationIdOf } from "./relationId.js";
import type { SiblingRow } from "./orderKeys.js";
import { buildLiveInLocaleWhere, collectionHasDrafts } from "./publishedWhere.js";
import { isForbidden, resolveReadMode } from "./readMode.js";
import type { ReadModeArgs } from "./readMode.js";
import { resolveRequestLocale } from "./resolve.js";
import { getResolvedOptions } from "./runtime.js";
import { folderPathIn, getPageDefaultLocale } from "./uniqueness.js";

export type TreeNode = {
  alternates?: Record<string, string>;
  children: TreeNode[];
  collection: string;
  /** Folders: whether a root page is visible to the reader, so the node can be linked. */
  hasPage: boolean;
  id: FolderId;
  isFolderRoot: boolean;
  kind: "folder" | "page";
  fullPath: string;
  title: string;
  updatedAt: string;
};

export type TreeArgs = ReadModeArgs & {
  /** Levels to return, default 3. */
  depth?: number;
  /** Include folders with no page the reader can see. Honoured for a signed-in reader only. Default false. */
  includeEmptyFolders?: boolean;
  /** Default: the default locale. */
  locale?: string | null;
  /** The folder whose contents to return; `null` (the default) is the whole site. */
  root?: FolderId | null;
};

const maxTreeLevels = 20;

const toText = (value: unknown): string => (typeof value === "string" ? value : "");

const pickLocalized = (value: unknown, key: string, defaultKey: string): string => {
  if (value && typeof value === "object") {
    const byLocale = value as Record<string, unknown>;

    return toText(byLocale[key]) || toText(byLocale[defaultKey]);
  }

  return toText(value);
};

/** One locale's value of a page field that is an object per locale when localized. */
const valueIn = (value: unknown, key: string, defaultKey: string): string =>
  pickLocalized(value, key, defaultKey);

type PageRow = {
  collection: string;
  createdAt: string | null;
  doc: Record<string, unknown>;
  folder: FolderId | null;
  id: FolderId;
  page: ResolvedPageCollection;
};

const readFolders = async ({
  mode,
  options,
  payload,
  root,
}: {
  mode: ReturnType<typeof resolveReadMode>;
  options: ResolvedOptions;
  payload: Payload;
  root: FolderId | null;
}): Promise<FolderRecord[]> => {
  try {
    const { docs } = await payload.find({
      collection: toCollectionSlug(options.folders.slug),
      depth: 0,
      locale: getLocaleCodes(payload.config).length > 0 ? ("all" as never) : undefined,
      overrideAccess: mode.overrideAccess,
      pagination: false,
      user: mode.user,
      ...(root === null
        ? {}
        : {
            where: {
              or: [{ id: { equals: root } }, { ancestorIds: { contains: `/${root}/` } }],
            },
          }),
    });

    return (docs as unknown as Array<Record<string, unknown>>).map(toFolderRecord);
  } catch (error) {
    if (isForbidden(error)) {
      return [];
    }
    throw error;
  }
};

/** Where that limits a page read to the pages inside `root` (any depth), or to every page. */
const insideRoot = (root: FolderId | null): Where | null =>
  root === null
    ? null
    : {
        or: [{ folder: { equals: root } }, { "folder.ancestorIds": { contains: `/${root}/` } }],
      };

/**
 * Every page the reader can see in the locale, as light rows: only the folder and the root flag.
 * It decides which folders have a page beneath them, however deep, and which have a root page.
 */
const readVisiblePages = async ({
  locale,
  mode,
  options,
  payload,
  root,
}: {
  locale: string | null;
  mode: ReturnType<typeof resolveReadMode>;
  options: ResolvedOptions;
  payload: Payload;
  root: FolderId | null;
}): Promise<Array<{ folder: FolderId; isFolderRoot: boolean }>> => {
  const rows: Array<{ folder: FolderId; isFolderRoot: boolean }> = [];
  for (const page of Object.values(options.collections)) {
    const live = mode.draft ? null : buildLiveInLocaleWhere(payload, page.slug, locale);
    const inside = insideRoot(root);
    try {
      const { docs } = await payload.find({
        collection: toCollectionSlug(page.slug),
        depth: 0,
        draft: mode.draft,
        ...(locale === null ? {} : { locale: locale as never }),
        overrideAccess: mode.overrideAccess,
        pagination: false,
        select: { folder: true, isFolderRoot: true } as SelectType,
        user: mode.user,
        where: {
          and: [{ folder: { exists: true } }, ...(inside ? [inside] : []), ...(live ? [live] : [])],
        },
      });
      for (const doc of docs as unknown as Array<Record<string, unknown>>) {
        const folder = relationIdOf(doc.folder);
        if (folder !== null) {
          rows.push({ folder, isFolderRoot: Boolean(doc.isFolderRoot) });
        }
      }
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
    }
  }

  return rows;
};

const readPages = async ({
  folderIds,
  locale,
  mode,
  options,
  payload,
  root,
}: {
  folderIds: FolderId[];
  locale: string | null;
  mode: ReturnType<typeof resolveReadMode>;
  options: ResolvedOptions;
  payload: Payload;
  root: FolderId | null;
}): Promise<PageRow[]> => {
  const rows: PageRow[] = [];
  for (const page of Object.values(options.collections)) {
    const hasDrafts = collectionHasDrafts(payload, page.slug);
    const live = mode.draft ? null : buildLiveInLocaleWhere(payload, page.slug, locale);
    const place: Where =
      root === null
        ? {
            or: [
              { folder: { exists: false } },
              ...(folderIds.length > 0 ? [{ folder: { in: folderIds } }] : []),
            ],
          }
        : { folder: { in: folderIds } };
    if (root !== null && folderIds.length === 0) {
      continue;
    }
    try {
      const { docs } = await payload.find({
        collection: toCollectionSlug(page.slug),
        depth: 0,
        draft: mode.draft,
        locale: getLocaleCodes(payload.config).length > 0 ? ("all" as never) : undefined,
        overrideAccess: mode.overrideAccess,
        pagination: false,
        select: {
          ...(hasDrafts ? { _status: true } : {}),
          createdAt: true,
          fullPath: true,
          orderKey: true,
          [page.titleField]: true,
          updatedAt: true,
        } as SelectType,
        user: mode.user,
        where: { and: [place, ...(live ? [live] : [])] },
      });
      for (const doc of docs as unknown as Array<Record<string, unknown>>) {
        rows.push({
          collection: page.slug,
          createdAt: typeof doc.createdAt === "string" ? doc.createdAt : null,
          doc,
          folder: relationIdOf(doc.folder),
          id: doc.id as FolderId,
          page,
        });
      }
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
    }
  }

  return rows;
};

/**
 * Spec section 10.1 `getTree`: the folders and pages beneath `root` (the whole site by default),
 * `depth` levels deep, ordered by `orderKey` the way the admin shows them. A folder's root page
 * is also a child of it, flagged `isFolderRoot`, and the folder is `hasPage` when one is visible.
 *
 * It reads as the user with the published rule of `resolvePath`: a page appears only when it is
 * live in the locale (or, with `draft`, when a signed-in reader may read its latest draft). A folder
 * with no page beneath it that the reader can see is left out, however deep the page sits, so an
 * unannounced section's name does not reach a public navigation. `includeEmptyFolders` keeps such
 * folders for a signed-in reader only. `alternates` lists a node's path in each locale it is live in.
 */
export const getTree = async (payload: Payload, args: TreeArgs = {}): Promise<TreeNode[]> => {
  const options = getResolvedOptions(payload);
  const locale = resolveRequestLocale(payload, args.locale);
  const mode = resolveReadMode(args);
  const root = args.root ?? null;
  const levels = Math.min(Math.max(Math.trunc(args.depth ?? 3), 0), maxTreeLevels);
  const keepEmptyFolders = Boolean(args.includeEmptyFolders) && !mode.isPublic;
  const codes = getLocaleCodes(payload.config);
  const defaultFolderKey = getDefaultLocaleKey(payload, options);
  const folderKey = codes.length > 0 && options.localizeSegments && locale ? locale : noLocaleKey;
  const pageKey = locale ?? noLocaleKey;
  const defaultPageKey = getPageDefaultLocale(payload);

  const folders = await readFolders({ mode, options, payload, root });
  const folderById = new Map(folders.map((folder) => [String(folder.id), folder]));
  const rootFolder = root === null ? null : (folderById.get(String(root)) ?? null);
  if (levels === 0 || (root !== null && rootFolder === null)) {
    return [];
  }
  const baseDepth = rootFolder?.depth ?? 0;

  // Which folders have a visible page beneath them, and which a visible root page.
  const visibleRows = await readVisiblePages({ locale, mode, options, payload, root });
  const foldersWithPage = new Set<string>();
  const foldersWithRootPage = new Set<string>();
  for (const { folder, isFolderRoot } of visibleRows) {
    foldersWithPage.add(String(folder));
    if (isFolderRoot) {
      foldersWithRootPage.add(String(folder));
    }
    const ancestors = folderById.get(String(folder))?.ancestorIds ?? "";
    for (const ancestor of ancestors.split("/").filter((part) => part !== "")) {
      foldersWithPage.add(ancestor);
    }
  }

  const levelOfFolder = (folder: FolderRecord): number => (folder.depth ?? 0) - baseDepth;
  const shownFolders = folders.filter(
    (folder) =>
      String(folder.id) !== String(root) &&
      levelOfFolder(folder) >= 1 &&
      levelOfFolder(folder) <= levels &&
      (keepEmptyFolders || foldersWithPage.has(String(folder.id)))
  );
  // A page sits one level below its folder, so only folders above the last level hold shown pages.
  const folderIdsForPages = [
    ...(rootFolder ? [rootFolder.id] : []),
    ...folders
      .filter((folder) => String(folder.id) !== String(root) && levelOfFolder(folder) <= levels - 1)
      .map((folder) => folder.id),
  ];
  const pageRows = await readPages({
    folderIds: folderIdsForPages,
    locale,
    mode,
    options,
    payload,
    root,
  });

  type Entry = { node: TreeNode; parent: FolderId | null; sibling: SiblingRow };
  const entries: Entry[] = [];

  for (const folder of shownFolders) {
    const path = folderPathIn(folder, folderKey, options, payload);
    if (path === "") {
      continue;
    }
    const slug = folder.slug[folderKey] || folder.slug[defaultFolderKey] || "";
    entries.push({
      node: {
        alternates:
          codes.length > 0
            ? Object.fromEntries(
                codes.map((code) => [
                  code,
                  formatPath(
                    folderPathIn(
                      folder,
                      options.localizeSegments ? code : noLocaleKey,
                      options,
                      payload
                    ),
                    options.urls.trailingSlash
                  ),
                ])
              )
            : undefined,
        children: [],
        collection: options.folders.slug,
        fullPath: formatPath(path, options.urls.trailingSlash),
        hasPage: foldersWithRootPage.has(String(folder.id)),
        id: folder.id,
        isFolderRoot: false,
        kind: "folder",
        title:
          pickLocalized(folder.name, folderKey, defaultFolderKey) ||
          slug ||
          `Folder ${String(folder.id)}`,
        updatedAt: toText(folder.storedRow.updatedAt),
      },
      parent: folder.parent,
      sibling: {
        collection: options.folders.slug,
        createdAt: toText(folder.storedRow.createdAt) || null,
        id: folder.id,
        kind: "folder",
        orderKey: folder.orderKey,
      },
    });
  }

  for (const row of pageRows) {
    const path = valueIn(row.doc.fullPath, pageKey, defaultPageKey);
    if (path === "") {
      continue;
    }
    const alternates = livePathsByLocale({
      draft: mode.draft,
      fullPath: row.doc.fullPath,
      hasDrafts: collectionHasDrafts(payload, row.collection),
      payload,
      status: row.doc._status,
    });
    entries.push({
      node: {
        alternates: codes.length > 0 ? alternates : undefined,
        children: [],
        collection: row.collection,
        fullPath: path,
        hasPage: false,
        id: row.id,
        isFolderRoot: Boolean(row.doc.isFolderRoot),
        kind: "page",
        title: pickLocalized(row.doc[row.page.titleField], pageKey, defaultPageKey) || "Untitled",
        updatedAt: toText(row.doc.updatedAt),
      },
      parent: row.folder,
      sibling: {
        collection: row.collection,
        createdAt: row.createdAt,
        id: row.id,
        kind: "page",
        orderKey: typeof row.doc.orderKey === "string" ? row.doc.orderKey : null,
      },
    });
  }

  const childrenOf = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = entry.parent === null ? "" : String(entry.parent);
    childrenOf.set(key, [...(childrenOf.get(key) ?? []), entry]);
  }
  const build = (parentKey: string): TreeNode[] =>
    (childrenOf.get(parentKey) ?? [])
      .toSorted((left, right) => compareSiblings(left.sibling, right.sibling))
      .map(({ node }) => ({
        ...node,
        children: node.kind === "folder" ? build(String(node.id)) : [],
      }));

  return build(root === null ? "" : String(root));
};
