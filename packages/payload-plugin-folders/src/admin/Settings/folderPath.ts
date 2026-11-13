import type { FolderId, TreeItem } from "../../types.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStoreState } from "../store.js";

/**
 * The path of the folder a page sits in (`/` at the top level): the folder's row when the tree has
 * it loaded, else the page's own path with its segment taken off, which is exact for a page that
 * is not a root page. A root page's path is its folder's.
 */
export const folderPathOfPage = (item: TreeItem, state: TreeStoreState): string => {
  if (item.parentId === null) {
    return "/";
  }
  const folder = findLoadedFolder(state, item.parentId as FolderId);
  if (folder !== null) {
    return folder.fullPath === "" ? "/" : folder.fullPath;
  }
  if (item.isFolderRoot === true) {
    return item.fullPath === "" ? "/" : item.fullPath;
  }
  const suffix = item.slug === null ? "" : `/${item.slug}`;
  const stripped =
    suffix !== "" && item.fullPath.endsWith(suffix)
      ? item.fullPath.slice(0, item.fullPath.length - suffix.length)
      : item.fullPath;

  return stripped === "" ? "/" : stripped;
};

/** The path of a folder (`/` at the top level) from the rows the tree has loaded; `/` when it is not loaded. */
export const folderPathOf = (state: TreeStoreState, folderId: FolderId | null): string => {
  const folder = folderId === null ? null : findLoadedFolder(state, folderId);

  return folder === null || folder.fullPath === "" ? "/" : folder.fullPath;
};
