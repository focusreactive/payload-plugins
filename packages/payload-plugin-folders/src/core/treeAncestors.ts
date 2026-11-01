import { NotFound } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { toFolderRecord } from "./folderRecords.js";
import { getResolvedOptions } from "./runtime.js";
import type { FolderId, ItemRef, ResolvedOptions, TreeItem } from "../types.js";
import {
  buildSources,
  buildTreeItems,
  readFolderDocs,
  readFolders,
  resolveViewLocale,
  sourceClauses,
} from "./treeItems.js";
import type { TreeRow } from "./treeItems.js";

export type AncestorFolder = { fullPath: string; id: FolderId; name: string };

export type AncestorsResult = {
  folders: AncestorFolder[];
  /**
   * With `withItems`: the tree row of each of `folders`, in the same order, as `GET /children`
   * would give it. The zoomed tree view needs a breadcrumb folder's depth, allowed types and
   * access, which `folders` leaves out.
   */
  items?: TreeItem[];
  /** With `withItems`, for a folder: the folder's own tree row. */
  item?: TreeItem;
};

/** Ids come out of the slash-delimited `ancestorIds` as text; the folders' own id type is restored. */
const idsOfAncestors = (ancestorIds: string | null, isNumeric: boolean): FolderId[] =>
  (ancestorIds ?? "")
    .split("/")
    .filter((id) => id !== "")
    .map((id) => (isNumeric ? Number(id) : id));

/**
 * Spec section 10.2 `GET /ancestors`: the folders above an item, the root-most first, for the
 * breadcrumb of a search hit. A folder's ancestors exclude itself; a page's include its folder.
 * An item the user cannot read, or that does not exist, is a 404 that says nothing else, and a
 * folder in the chain that the user cannot read is left out.
 */
export const getAncestors = async (
  req: PayloadRequest,
  {
    item,
    locale,
    withItems = false,
  }: { item: ItemRef; locale?: string | null; withItems?: boolean },
  options: ResolvedOptions = getResolvedOptions(req.payload)
): Promise<AncestorsResult> => {
  const sources = await buildSources(req, options);
  const [folderSource] = sources;
  const itemSource = sources.find((source) => source.collection === item.collection);
  if (!itemSource?.scope.isAllowed) {
    throw new NotFound(req.t);
  }
  const row = (await req.payload.db.findOne({
    collection: toCollectionSlug(item.collection),
    locale: "all",
    req,
    // The tree row of a folder is built from the whole row.
    ...(withItems && itemSource.kind === "folder"
      ? {}
      : { select: itemSource.kind === "folder" ? { ancestorIds: true } : { folder: true } }),
    where: { and: [{ id: { equals: item.id } }, ...sourceClauses(req, itemSource)] },
  })) as Record<string, unknown> | null;
  if (!row) {
    throw new NotFound(req.t);
  }

  const isNumeric =
    (req.payload.collections[toCollectionSlug(options.folders.slug)]?.customIDType ??
      req.payload.db.defaultIDType) === "number";
  let chain: FolderId[];
  if (itemSource.kind === "folder") {
    chain = idsOfAncestors(typeof row.ancestorIds === "string" ? row.ancestorIds : null, isNumeric);
  } else {
    const folderId =
      typeof row.folder === "object" && row.folder
        ? (row.folder as { id: FolderId }).id
        : (row.folder as FolderId | null);
    if (folderId === null || folderId === undefined) {
      return { folders: [] };
    }
    const parent = (await readFolders({ ids: [folderId], req, source: folderSource })).get(
      String(folderId)
    );
    chain = parent ? [...idsOfAncestors(parent.ancestorIds, isNumeric), parent.id] : [];
  }

  const docs = await readFolderDocs({ ids: chain, req, source: folderSource });
  const view = resolveViewLocale(req, options, locale);
  // A folder in the chain that the user cannot read is left out.
  const readableChain = chain.filter((id) => docs.has(String(id)));

  const folders = readableChain.map((id) => {
    const folder = toFolderRecord(docs.get(String(id)) as Record<string, unknown>);

    return {
      fullPath: folder.fullPath[view.folderKey] || folder.fullPath[view.defaultFolderKey] || "",
      id: folder.id,
      name:
        folder.name[view.folderKey] ||
        folder.name[view.defaultFolderKey] ||
        folder.slug[view.defaultFolderKey] ||
        "",
    };
  });
  if (!withItems) {
    return { folders };
  }

  const rows: TreeRow[] = readableChain.map((id) => ({
    doc: docs.get(String(id)) as Record<string, unknown>,
    source: folderSource,
  }));
  const isFolderItem = itemSource.kind === "folder";
  if (isFolderItem) {
    rows.push({ doc: row, source: folderSource });
  }
  const built = await buildTreeItems({ options, parents: new Map(), req, rows, sources, view });

  return isFolderItem
    ? { folders, item: built.at(-1), items: built.slice(0, -1) }
    : { folders, items: built };
};
