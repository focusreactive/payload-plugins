import { useDocumentInfo } from "@payloadcms/ui";
import { useState } from "react";

import type { FolderId } from "../../types.js";
import { fetchCheckRoot } from "../api.js";
import { useAdminRoutes, useLocaleCode } from "../compat.js";
import { sharedRead } from "./sharedRead.js";
import { useAsyncRead } from "../useAsyncRead.js";

/** The other page that is, or in its latest version is about to be, the folder's root page. */
export type RootClash = { path: string; title: string };

type Loaded = { clash: RootClash | null; key: string };

/**
 * Whether another page holds the root page place of the folder the page sits in, read from the
 * server against the latest versions (spec section 2.6, decision 10). `null` when nothing does or
 * while it is unknown; read again after every save of the form.
 */
export const useRootClash = ({
  collection,
  enabled,
  id,
  parent,
}: {
  collection: string | undefined;
  enabled: boolean;
  id: FolderId | undefined;
  /** The page's folder; `null` is the top level. */
  parent: FolderId | null;
}): RootClash | null => {
  const { apiBaseUrl } = useAdminRoutes();
  const locale = useLocaleCode();
  const { lastUpdateTime } = useDocumentInfo();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const key = `${collection}:${id}:${locale}:${String(parent)}:${String(lastUpdateTime)}`;

  useAsyncRead(
    async (isCurrent) => {
      if (!enabled || collection === undefined || id === undefined) {
        return;
      }
      try {
        const answer = await sharedRead(`root:${key}`, () =>
          fetchCheckRoot({ baseUrl: apiBaseUrl }, { exclude: { collection, id }, locale, parent })
        );
        if (isCurrent()) {
          setLoaded({ clash: answer.ok ? null : (answer.conflict ?? null), key });
        }
      } catch {
        if (isCurrent()) {
          setLoaded({ clash: null, key });
        }
      }
    },
    [apiBaseUrl, collection, enabled, id, key, locale, parent]
  );

  return enabled && loaded !== null ? loaded.clash : null;
};
