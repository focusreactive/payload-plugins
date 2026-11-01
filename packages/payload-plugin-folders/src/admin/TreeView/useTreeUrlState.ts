import { useCallback } from "react";

import type { FolderId } from "../../types.js";
import { useSearchParams } from "../compat.js";
import { formatExpandedParam, parseFolderParam, queryWith } from "./treeUrlState.js";

/**
 * Puts parameters into the address without leaving the page. Next.js routes the browser's own
 * `pushState` and `replaceState` into `useSearchParams`, so the view follows without a request to
 * the server (a router push would render the list view on the server again for every folder
 * opened). The state argument must be `null`: Next copies its own history state over, and a call
 * that passes that state back is taken for Next's own and never reaches `useSearchParams`.
 */
const writeQuery = (
  changes: Readonly<Record<string, string | null>>,
  mode: "push" | "replace"
): void => {
  const { hash, pathname, search } = window.location;
  const url = `${pathname}${queryWith(search, changes)}${hash}`;
  if (url === `${pathname}${search}${hash}`) {
    return;
  }
  if (mode === "push") {
    window.history.pushState(null, "", url);
  } else {
    window.history.replaceState(null, "", url);
  }
};

export type TreeUrlState = {
  /** The raw `?expanded=` value; `null` when the address has none. */
  expandedParam: string | null;
  /** Writes the open folders into the address, replacing the current history entry. */
  setExpandedInUrl: (folders: readonly FolderId[]) => void;
  /** Zooms by adding a history entry, so Back returns to where the editor was. */
  setZoomInUrl: (folderId: FolderId | null) => void;
  /** `?folder=<id>`: the zoomed folder, `null` for the top level. */
  zoomFolderId: FolderId | null;
};

/** The tree view's state in the address (spec section 7.2): `?folder=` and `?expanded=`. */
export const useTreeUrlState = (): TreeUrlState => {
  const searchParams = useSearchParams();
  const zoomFolderId = parseFolderParam(searchParams.get("folder"));
  const expandedParam = searchParams.get("expanded");

  const setZoomInUrl = useCallback((folderId: FolderId | null) => {
    writeQuery({ folder: folderId === null ? null : String(folderId) }, "push");
  }, []);
  const setExpandedInUrl = useCallback((folders: readonly FolderId[]) => {
    writeQuery({ expanded: formatExpandedParam(folders) }, "replace");
  }, []);

  return { expandedParam, setExpandedInUrl, setZoomInUrl, zoomFolderId };
};
