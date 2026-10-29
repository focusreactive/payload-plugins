"use client";

import { useEffect, useState } from "react";

import {
  ListHeader,
  SetStepNav,
  useAdminRoutes,
  useFoldersTranslation,
  useLocaleCode,
  useRouter,
  useUserId,
} from "../compat.js";
import { getSharedTreeStore, revisionPollIntervalMs } from "../store.js";
import { Tree } from "../Tree/Tree.js";
import "../styles.css";

export type TreeViewClientProps = {
  /** The locale the server rendered the list in; the client's own locale wins once it is known. */
  initialLocale: string | null;
  pageSize: number;
  title: string;
  /** Page collection slug to the label of the Type column. */
  typeLabels: Record<string, string>;
};

/** Content tree view: the folders list view of the collection, as a tree (spec section 7.2). */
export const TreeViewClient = ({
  initialLocale,
  pageSize,
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

  // Configuring resets the cache when the locale changed, which tells every subscriber, so it
  // happens in an effect and the tree mounts only afterwards.
  useEffect(() => {
    store.configure({ baseUrl: apiBaseUrl, locale, pageSize, userId });
    setIsConfigured(true);
    // Coming back to the view (after editing a page, say) shows rows read earlier: read them again.
    void store.refetchVisible();
  }, [apiBaseUrl, locale, pageSize, store, userId]);

  useEffect(() => {
    if (!isConfigured) {
      return undefined;
    }
    // Payload has no realtime API: the revision is polled, and read again when the tab is back.
    const stopPolling = store.startPolling(revisionPollIntervalMs);
    const pollOnReturn = () => {
      if (document.visibilityState === "visible") {
        void store.pollRevision();
      }
    };
    window.addEventListener("focus", pollOnReturn);
    document.addEventListener("visibilitychange", pollOnReturn);

    return () => {
      stopPolling();
      window.removeEventListener("focus", pollOnReturn);
      document.removeEventListener("visibilitychange", pollOnReturn);
    };
  }, [isConfigured, store]);

  return (
    <div className="collection-list fr-folders">
      <SetStepNav nav={[{ label: title }]} />
      <ListHeader title={title} />
      <div className="fr-folders-body">
        {isConfigured ? (
          <Tree
            adminRoute={adminRoute}
            language={language}
            onOpenPage={(url) => router.push(url)}
            pageSize={pageSize}
            store={store}
            translate={translate}
            typeLabels={typeLabels}
          />
        ) : null}
      </div>
    </div>
  );
};
