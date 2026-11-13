"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { FolderId } from "../../types.js";
import {
  useAdminRoutes,
  useFoldersTranslation,
  useIsSidebarTabActive,
  useLocaleCode,
  useParams,
  usePathname,
  useRouter,
  useUserId,
} from "../compat.js";
import { getSharedTreeStore } from "../store.js";
import "../styles.css";
import type { SearchScope } from "../TreeView/treeUrlState.js";
import type { TreeViewClientProps } from "../TreeView/TreeViewClient.js";
import { TreeWorkspace } from "../TreeView/TreeWorkspace.js";
import { useApiContext } from "../useApiContext.js";
import { usePolling } from "../usePolling.js";
import { sidebarTabSlug } from "../../constants.js";
import { openDocumentOf } from "./openDocument.js";
import { useRevealOpenDocument } from "./useRevealOpenDocument.js";
import { itemKey } from "../../core/itemKey.js";

/** The tree view's address for a folder: where "open" on a folder leads from the sidebar. */
const treeViewUrl = (adminRoute: string, foldersSlug: string, folderId: FolderId | null): string =>
  `${adminRoute}/collections/${foldersSlug}${folderId === null ? "" : `?folder=${folderId}`}`;

/**
 * The plugin's tab in the admin's sidebar (spec section 7.12): the shared tree, compact, for the
 * page the editor is on. The store is the tree view's own, so a move made here shows in the view
 * and in the edit view's location at once. It does nothing while another tab is open: Payload
 * keeps a tab it has loaded mounted, and a hidden tree would otherwise read the server on every
 * page of the admin.
 */
export const SidebarTabClient = ({
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
  const untitledTitle = translate("untitledPage");
  const locale = useLocaleCode() ?? initialLocale;
  const userId = useUserId();
  const isActive = useIsSidebarTabActive(sidebarTabSlug);
  const [isConfigured, setIsConfigured] = useState(false);
  const [search, setSearch] = useState<{ query: string; scope: SearchScope }>({
    query: "",
    scope: "all",
  });

  // Configuring resets the cache when the locale changed, which tells every subscriber, so it
  // happens in an effect and the tree mounts only afterwards.
  useEffect(() => {
    if (!isActive) {
      return undefined;
    }
    store.configure({ baseUrl: apiBaseUrl, foldersSlug, locale, pageSize, untitledTitle, userId });
    setIsConfigured(true);
    // The tab was hidden, or never shown: whatever it shows is read again.
    void store.refetchVisible();
    // The tab shows the top level whatever the tree view is zoomed into.
    const release = store.retainFullTree();

    return release;
  }, [apiBaseUrl, foldersSlug, isActive, locale, pageSize, store, untitledTitle, userId]);
  const isReady = isActive && isConfigured;
  usePolling(store, isReady);

  const apiContext = useApiContext(store);
  const params = useParams();
  const pathname = usePathname();
  const collections = useMemo(
    () => [...Object.keys(typeLabels), foldersSlug],
    [foldersSlug, typeLabels]
  );
  const openDocument = useMemo(
    () => openDocumentOf({ adminRoute, collections, params, pathname }),
    [adminRoute, collections, params, pathname]
  );
  useRevealOpenDocument({ apiContext, isReady, locale, openDocument, store });

  const onSearchChange = useCallback(
    (changes: { query?: string; scope?: SearchScope }) =>
      setSearch((current) => ({
        query: changes.query ?? current.query,
        scope: changes.scope ?? current.scope,
      })),
    []
  );

  return (
    <div className="fr-folders fr-folders--compact" data-testid="sidebar-tab">
      {isReady ? (
        <TreeWorkspace
          adminRoute={adminRoute}
          confirmMoves={confirmMoves}
          currentKey={openDocument === null ? null : itemKey(openDocument)}
          draftCollections={draftCollections}
          enforceAllowedTypesOnMove={enforceAllowedTypesOnMove}
          foldersSlug={foldersSlug}
          hasPreviewUrl={hasPreviewUrl}
          language={language}
          maxDepth={maxDepth}
          mode="compact"
          onOpenPage={(url) => router.push(url)}
          onSearchChange={onSearchChange}
          onZoom={(folderId) => router.push(treeViewUrl(adminRoute, foldersSlug, folderId))}
          pageFields={pageFields}
          pageSize={pageSize}
          reservedRootSegments={reservedRootSegments}
          searchQuery={search.query}
          searchScope={search.scope}
          store={store}
          title={title}
          translate={translate}
          typeLabels={typeLabels}
        />
      ) : null}
    </div>
  );
};
