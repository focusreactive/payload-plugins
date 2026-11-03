"use client";

import { useEffect, useState } from "react";

import {
  ListHeader,
  SetStepNav,
  useAdminRoutes,
  useFoldersTranslation,
  useLocaleCode,
  usePreferences,
  useRouter,
  useUserId,
} from "../compat.js";
import { getSharedTreeStore } from "../store.js";
import { usePolling } from "../usePolling.js";
import "../styles.css";
import { zoomFolderIdOfLocation } from "./treeUrlState.js";
import { useExpandedPersistence } from "./useExpandedPersistence.js";
import { useTreeUrlState } from "./useTreeUrlState.js";
import { TreeWorkspace } from "./TreeWorkspace.js";
import type { ConfirmMoves } from "../../types.js";

export type TreeViewClientProps = {
  /** When to ask before a move (`admin.confirmMoves`). */
  confirmMoves: ConfirmMoves;
  /** Page collections with drafts: a new page of one is created as a draft. */
  draftCollections: string[];
  /** Whether a folder's allowed types refuse a move, for the folders the picker greys out. */
  enforceAllowedTypesOnMove: boolean;
  /** The slug of the folders collection. */
  foldersSlug: string;
  /** Whether the host set `admin.previewUrl`: the context menu then offers "View page". */
  hasPreviewUrl: boolean;
  /** The locale the server rendered the list in; the client's own locale wins once it is known. */
  initialLocale: string | null;
  /** The deepest a URL may go (`maxDepth`). */
  maxDepth: number;
  /** Page collection slug to the names of its title and segment fields. */
  pageFields: Record<string, { segmentField: string; titleField: string }>;
  pageSize: number;
  /** Segments the top level cannot take. */
  reservedRootSegments: string[];
  title: string;
  /** Page collection slug to the label of the Type column. */
  typeLabels: Record<string, string>;
};

/** Content tree view: the folders list view of the collection, as a tree (spec section 7.2). */
export const TreeViewClient = ({
  confirmMoves,
  draftCollections,
  enforceAllowedTypesOnMove,
  foldersSlug,
  hasPreviewUrl,
  initialLocale,
  maxDepth,
  pageFields,
  pageSize,
  reservedRootSegments,
  title,
  typeLabels,
}: TreeViewClientProps) => {
  const store = getSharedTreeStore();
  const router = useRouter();
  const { adminRoute, apiBaseUrl } = useAdminRoutes();
  const { language, translate } = useFoldersTranslation();
  const locale = useLocaleCode() ?? initialLocale;
  const userId = useUserId();
  const [isConfigured, setIsConfigured] = useState(false);
  const urlState = useTreeUrlState();
  const { getPreference, setPreference } = usePreferences();
  // Which folders are open comes from the address, else from what the editor left open before.
  const isReady = useExpandedPersistence({
    expandedParam: urlState.expandedParam,
    getPreference,
    isConfigured,
    setExpandedInUrl: urlState.setExpandedInUrl,
    setPreference,
    store,
    zoomFolderId: urlState.zoomFolderId,
  });

  // The address names the zoomed folder; going back to the top level or to another folder with
  // the browser's buttons changes it too. The browser's own address is what is read, not the
  // router's copy of it: after two quick steps through the history the router can still be
  // catching up with the first while the address has already moved on. `zoomFolderId` only says
  // when to look.
  const { zoomFolderId } = urlState;
  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    const followAddress = () => {
      void store.setZoom(zoomFolderIdOfLocation());
    };
    followAddress();
    window.addEventListener("popstate", followAddress);

    return () => window.removeEventListener("popstate", followAddress);
    // `zoomFolderId` is the trigger for a change the router noticed (a link, Payload's own redirect).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, store, zoomFolderId]);
  // The store is shared with the edit view's location field, which wants the whole tree.
  useEffect(
    () => () => {
      void store.setZoom(null);
    },
    [store]
  );

  // Configuring resets the cache when the locale changed, which tells every subscriber, so it
  // happens in an effect and the tree mounts only afterwards.
  useEffect(() => {
    store.configure({ baseUrl: apiBaseUrl, foldersSlug, locale, pageSize, userId });
    setIsConfigured(true);
    // Coming back to the view (after editing a page, say) shows rows read earlier: read them again.
    void store.refetchVisible();
  }, [apiBaseUrl, foldersSlug, locale, pageSize, store, userId]);

  usePolling(store, isConfigured);

  return (
    <div className="collection-list fr-folders">
      <SetStepNav nav={[{ label: title }]} />
      {isConfigured && isReady ? (
        <TreeWorkspace
          adminRoute={adminRoute}
          confirmMoves={confirmMoves}
          draftCollections={draftCollections}
          enforceAllowedTypesOnMove={enforceAllowedTypesOnMove}
          foldersSlug={foldersSlug}
          hasPreviewUrl={hasPreviewUrl}
          language={language}
          maxDepth={maxDepth}
          onOpenPage={(url) => router.push(url)}
          onSearchChange={urlState.setSearchInUrl}
          onZoom={(folderId) => {
            // The store moves at once, from the rows it has; the address follows so Back works.
            void store.setZoom(folderId);
            urlState.setZoomInUrl(folderId);
          }}
          pageFields={pageFields}
          pageSize={pageSize}
          reservedRootSegments={reservedRootSegments}
          searchQuery={urlState.searchQuery}
          searchScope={urlState.searchScope}
          store={store}
          title={title}
          translate={translate}
          typeLabels={typeLabels}
        />
      ) : (
        <ListHeader title={title} />
      )}
    </div>
  );
};
