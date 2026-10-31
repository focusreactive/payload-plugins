import { NotFound } from "payload";
import type { PayloadRequest } from "payload";

import { toCollectionSlug } from "../collectionSlug.js";
import { getResolvedOptions } from "./runtime.js";
import type { FolderId, ItemRef, ResolvedOptions } from "../types.js";
import { buildSources, readFolders, resolveViewLocale, sourceClauses } from "./treeItems.js";

export type AncestorFolder = { fullPath: string; id: FolderId; name: string };

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
  { item, locale }: { item: ItemRef; locale?: string | null },
  options: ResolvedOptions = getResolvedOptions(req.payload)
): Promise<{ folders: AncestorFolder[] }> => {
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
    select: itemSource.kind === "folder" ? { ancestorIds: true } : { folder: true },
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

  const records = await readFolders({ ids: chain, req, source: folderSource });
  const view = resolveViewLocale(req, options, locale);

  return {
    folders: chain.flatMap((id) => {
      const folder = records.get(String(id));
      if (!folder) {
        return [];
      }

      return [
        {
          fullPath: folder.fullPath[view.folderKey] || folder.fullPath[view.defaultFolderKey] || "",
          id: folder.id,
          name:
            folder.name[view.folderKey] ||
            folder.name[view.defaultFolderKey] ||
            folder.slug[view.defaultFolderKey] ||
            "",
        },
      ];
    }),
  };
};
