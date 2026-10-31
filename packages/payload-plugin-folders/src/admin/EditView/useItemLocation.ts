import { useEffect, useMemo, useState } from "react";

import type { FolderId } from "../../types.js";
import { fetchAncestors } from "../api.js";
import type { AncestorFolder } from "../api.js";
import { useAdminRoutes, useLocaleCode, useUserId } from "../compat.js";
import { getSharedTreeStore, loadedItemsOf, revisionPollIntervalMs } from "../store.js";
import type { TreeStore, TreeStoreState } from "../store.js";
import { useApiContext } from "../useApiContext.js";
import { useTreeStoreState } from "../useTreeStore.js";

/** Where a page sits: the folders above it, the top one first. */
export type ItemLocation = {
  folders: AncestorFolder[];
  /** The page's folder; `null` at the top level. */
  parentId: FolderId | null;
  /** The page's folder's path in the admin locale; `/` at the top level. */
  folderPath: string;
};

/**
 * The shared tree store for an edit view, which the tree view did not configure: the same options
 * the tree view gives it, so the two never reset each other. `null` until the options are set.
 */
export const useConfiguredStore = (pageSize: number): TreeStore | null => {
  const store = getSharedTreeStore();
  const { apiBaseUrl } = useAdminRoutes();
  const locale = useLocaleCode();
  const userId = useUserId();
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    store.configure({ baseUrl: apiBaseUrl, locale, pageSize, userId });
    setIsConfigured(true);
  }, [apiBaseUrl, locale, pageSize, store, userId]);

  return isConfigured ? store : null;
};

/** The folder the store has this item in, `undefined` while the item is not among the loaded rows. */
export const loadedParentOf = (
  state: TreeStoreState,
  collection: string,
  id: FolderId
): FolderId | null | undefined =>
  loadedItemsOf(state).find(
    (item) => item.collection === collection && String(item.id) === String(id)
  )?.parentId;

type Loaded = { key: string; location: ItemLocation };

/**
 * Where a page sits, read from the shared store: a move made anywhere on the page (the tree, the
 * sidebar tab, this view's Move button) changes the store's row or its revision, and the folders
 * above the page are read again at once (spec section 7.11). `refresh` reads them again for a
 * change the store does not know of.
 */
export const useItemLocation = ({
  collection,
  id,
  store,
}: {
  collection: string;
  id: FolderId | undefined;
  store: TreeStore | null;
}): { location: ItemLocation | null; refresh: () => void } => {
  const fallbackStore = getSharedTreeStore();
  const activeStore = store ?? fallbackStore;
  const state = useTreeStoreState(activeStore);
  const apiContext = useApiContext(activeStore);
  const locale = store?.getOptions()?.locale ?? null;
  const [refreshCount, setRefreshCount] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const liveParent = id === undefined ? undefined : loadedParentOf(state, collection, id);
  const key = `${collection}:${id}:${locale}:${String(liveParent)}:${state.revision}:${refreshCount}`;

  // The revision is polled while the view is open, so a move made by another editor shows up too.
  useEffect(() => {
    if (store === null) {
      return undefined;
    }

    return store.startPolling(revisionPollIntervalMs);
  }, [store]);

  useEffect(() => {
    if (store === null || id === undefined) {
      return undefined;
    }
    let isCurrent = true;
    const read = async () => {
      try {
        const { folders } = await fetchAncestors(apiContext, { item: { collection, id }, locale });
        if (isCurrent) {
          const last = folders.at(-1);
          setLoaded({
            key,
            location: {
              folderPath: last?.fullPath || "/",
              folders,
              parentId: last?.id ?? null,
            },
          });
        }
      } catch {
        // The breadcrumb keeps what it showed: the page may be gone or unreadable for this user.
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, collection, id, key, locale, store]);

  return useMemo(
    () => ({
      location: loaded?.location ?? null,
      refresh: () => setRefreshCount((current) => current + 1),
    }),
    [loaded]
  );
};
