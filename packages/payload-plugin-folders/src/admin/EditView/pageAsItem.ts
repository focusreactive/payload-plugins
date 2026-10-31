import type { FolderId, TreeItem } from "../../types.js";
import { fetchDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";

type PageDocument = Record<string, unknown> & {
  _status?: string;
  folder?: FolderId | { id: FolderId } | null;
  isFolderRoot?: boolean | null;
  orderKey?: string | null;
  structureRevision?: number | null;
  updatedAt?: string;
};

const textOf = (value: unknown): string => (typeof value === "string" ? value : "");

/**
 * The page as a tree row, read fresh from the page itself, for the Move dialog of the edit view:
 * a move names the folder and order key the editor saw, so they have to be the stored ones and not
 * what the form loaded with. The server decides access, so the flags say yes.
 */
export const readPageAsItem = async (
  context: FoldersApiContext,
  {
    collection,
    id,
    locale,
    segmentField,
    titleField,
  }: {
    collection: string;
    id: FolderId;
    locale: string | null;
    segmentField: string;
    titleField: string;
  }
): Promise<TreeItem> => {
  const page = await fetchDocument<PageDocument>(context, { collection, id, locale });
  const folder = page.folder;
  const segment = textOf(page[segmentField]);

  return {
    access: { delete: true, publish: true, update: true },
    collection,
    depth: null,
    fullPath: textOf(page.fullPath),
    id,
    isFolderRoot: Boolean(page.isFolderRoot),
    kind: "page",
    orderKey: page.orderKey ?? null,
    parentId:
      folder === null || folder === undefined
        ? null
        : typeof folder === "object"
          ? folder.id
          : folder,
    slug: segment === "" ? null : segment,
    slugIsFallback: false,
    status:
      page._status === "draft" ? "draft" : page._status === "published" ? "published" : "live",
    structureRevision: page.structureRevision ?? 0,
    title: textOf(page[titleField]),
    updatedAt: page.updatedAt ?? "",
  };
};
