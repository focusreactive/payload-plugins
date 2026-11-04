import { withoutTrailingSlash } from "../../core/paths.js";
import { relationIdOf } from "../../core/relationId.js";
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
  const segment = textOf(page[segmentField]);

  return {
    access: { delete: true, publish: true, update: true },
    collection,
    depth: null,
    // The page's `fullPath` is in the `urls.trailingSlash` form; admin logic works on canonical paths.
    fullPath: withoutTrailingSlash(textOf(page.fullPath)),
    id,
    isFolderRoot: Boolean(page.isFolderRoot),
    kind: "page",
    orderKey: page.orderKey ?? null,
    parentId: relationIdOf(page.folder),
    slug: segment === "" ? null : segment,
    slugIsFallback: false,
    titleIsFallback: false,
    status:
      page._status === "draft" ? "draft" : page._status === "published" ? "published" : "live",
    structureRevision: page.structureRevision ?? 0,
    title: textOf(page[titleField]),
    updatedAt: page.updatedAt ?? "",
  };
};
