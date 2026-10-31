import { useEffect, useState } from "react";

import type { FolderId } from "../../types.js";
import { fetchDocument } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import { findLoadedFolder } from "../store.js";
import type { TreeStoreState } from "../store.js";

/**
 * A folder's name for a label: from the rows the tree has loaded, else read from the folder
 * itself, which falls back to the default language. `null` until it is known, and for the top level.
 */
export const useFolderName = ({
  apiContext,
  foldersSlug,
  id,
  locale,
  state,
}: {
  apiContext: FoldersApiContext;
  foldersSlug: string;
  id: FolderId | null;
  locale: string | null;
  state: TreeStoreState;
}): string | null => {
  const loadedTitle = id === null ? null : (findLoadedFolder(state, id)?.title ?? null);
  const [fetched, setFetched] = useState<{ id: FolderId; name: string } | null>(null);

  useEffect(() => {
    if (id === null || loadedTitle !== null) {
      return undefined;
    }
    let isCurrent = true;
    const read = async () => {
      try {
        const doc = await fetchDocument<{ name?: string | null }>(apiContext, {
          collection: foldersSlug,
          id,
          locale,
        });
        if (isCurrent && doc.name) {
          setFetched({ id, name: doc.name });
        }
      } catch {
        // The label stays empty: the caller shows a neutral wording.
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, foldersSlug, id, loadedTitle, locale]);

  if (id === null) {
    return null;
  }

  return (
    loadedTitle ?? (fetched !== null && String(fetched.id) === String(id) ? fetched.name : null)
  );
};
