import type { TreeItem } from "../../types.js";

/**
 * What the second line of a row shows: the path, a note that the page has no URL in this locale
 * yet, or nothing because the path is not the user's to know. A page whose folder the user cannot
 * read comes back with `depth: null` and an empty path (PROGRESS decision 26); that is not the
 * same as a page that simply has no segment yet.
 */
export const pathDisplayOf = (item: TreeItem): "missing" | "path" | "unknown" => {
  if (item.fullPath !== "") {
    return "path";
  }

  return item.depth === null ? "unknown" : "missing";
};
