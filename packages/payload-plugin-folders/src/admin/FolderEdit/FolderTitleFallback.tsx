import { useConfig, useDocumentInfo, useDocumentTitle } from "@payloadcms/ui";

import type { ReactNode } from "react";

import { fetchDocument } from "../api.js";
import { useAdminRoutes } from "../compat.js";
import { useAsyncRead } from "../useAsyncRead.js";

/**
 * A folder that has no name in the language the admin is in gets its id as the heading, because
 * Payload's title falls back to the id and has no hook for anything better (the stock list and the
 * relationship pickers read the same `useAsTitle` field, so it cannot point elsewhere). This puts
 * the default language's name in the heading instead, as the tree already shows it. It renders
 * nothing.
 */
export const FolderTitleFallback = (): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const { config } = useConfig();
  const { apiBaseUrl } = useAdminRoutes();
  const { setDocumentTitle, title } = useDocumentTitle();
  const defaultLocale = config.localization ? config.localization.defaultLocale : null;
  const hasIdAsTitle = id !== undefined && title === String(id);

  useAsyncRead(
    async (isCurrent) => {
      if (!hasIdAsTitle || id === undefined || !collectionSlug || defaultLocale === null) {
        return;
      }
      try {
        const folder = await fetchDocument<{ name?: string | null }>(
          { baseUrl: apiBaseUrl },
          { collection: collectionSlug, draft: false, id, locale: defaultLocale }
        );
        if (isCurrent() && folder.name) {
          setDocumentTitle(folder.name);
        }
      } catch {
        // The heading stays as Payload made it.
      }
    },
    [apiBaseUrl, collectionSlug, defaultLocale, hasIdAsTitle, id, setDocumentTitle]
  );

  return null;
};
