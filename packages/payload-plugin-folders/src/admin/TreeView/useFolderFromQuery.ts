import { useEffect } from "react";

import { fetchAncestors } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import { useSearchParams } from "../compat.js";
import type { TreeStore } from "../store.js";

/**
 * `?folder=<id>` on the tree view (the edit view's breadcrumb links here, spec section 7.11):
 * opens the folders above that folder, top first, and puts the keyboard focus on its row. Zooming
 * into the folder is P-35's; until then the link shows it in place.
 */
export const useFolderFromQuery = ({
  apiContext,
  focusRow,
  foldersSlug,
  store,
}: {
  apiContext: FoldersApiContext;
  focusRow: (collection: string, id: string) => void;
  foldersSlug: string;
  store: TreeStore;
}): void => {
  const folderId = useSearchParams().get("folder");

  useEffect(() => {
    if (folderId === null || folderId === "") {
      return undefined;
    }
    let isCurrent = true;
    const open = async () => {
      try {
        const { folders } = await fetchAncestors(apiContext, {
          item: { collection: foldersSlug, id: folderId },
          locale: store.getOptions()?.locale ?? null,
        });
        // One at a time: a folder's row exists only once the folder above it has loaded.
        for (const ancestor of folders) {
          if (!isCurrent) {
            return;
          }
          await store.setExpanded(ancestor.id, true);
        }
        if (isCurrent) {
          focusRow(foldersSlug, folderId);
        }
      } catch {
        // A folder that is gone or unreadable leaves the tree as it is.
      }
    };
    void open();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, focusRow, folderId, foldersSlug, store]);
};
