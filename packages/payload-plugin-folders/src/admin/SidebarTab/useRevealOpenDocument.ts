import { useEffect } from "react";

import { fetchAncestors } from "../api.js";
import type { FoldersApiContext } from "../api.js";
import type { TreeStore } from "../store.js";
import type { OpenDocument } from "./openDocument.js";

/**
 * Opens the folders above the document that is open in the edit view, so its row is in the tree
 * (spec section 7.12). The ancestors come from `/ancestors`, because the tab does not know where
 * the document sits. It runs when the open document changes, not on every change of the tree: a
 * folder the editor closes afterwards stays closed.
 */
export const useRevealOpenDocument = ({
  apiContext,
  isReady,
  locale,
  openDocument,
  store,
}: {
  apiContext: FoldersApiContext;
  /** The store is configured and the tab is showing. */
  isReady: boolean;
  locale: string | null;
  openDocument: OpenDocument | null;
  store: TreeStore;
}): void => {
  const collection = openDocument?.collection;
  const id = openDocument?.id;
  useEffect(() => {
    if (!isReady || collection === undefined || id === undefined) {
      return undefined;
    }
    let isCurrent = true;
    void (async () => {
      try {
        const { folders } = await fetchAncestors(apiContext, { item: { collection, id }, locale });
        if (isCurrent) {
          await Promise.all(folders.map((folder) => store.setExpanded(folder.id, true)));
        }
      } catch {
        // A page that is gone, or that this user cannot read, has no place in the tree to show.
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, [apiContext, collection, id, isReady, locale, store]);
};
