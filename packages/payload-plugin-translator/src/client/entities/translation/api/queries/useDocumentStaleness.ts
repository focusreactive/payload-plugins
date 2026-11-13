import { useQuery } from "@tanstack/react-query";
import { FetchError, ofetch } from "ofetch";
import type { CollectionSlug } from "payload";

import { useTranslateKitConfig } from "../../../../shared/config/index.js";
import { handleNextApiError } from "../../../../shared/api/handleApiError.js";
import type { DocumentStaleness } from "../../model/types.js";
import { translationKeys } from "../../queries/translationKeys.js";

type Props = {
  collection: CollectionSlug;
  id: string;
};

type Options = {
  enabled?: boolean;
};

const NOTHING_TO_REPORT: DocumentStaleness = { locales: [] };

const isNotFound = (error: unknown) => error instanceof FetchError && error.status === 404;

/**
 * Reads per-locale staleness for a document (#50). Computed lazily on the server, so there is no
 * polling — it refetches on mount / window focus and whenever an action settles.
 *
 * The route exists only while provenance is switched on, so its absence is an answer — no locale is
 * out of date — rather than a failure to show the editor.
 */
export function useDocumentStaleness({ collection, id }: Props, options?: Options) {
  const { basePath } = useTranslateKitConfig();

  return useQuery<DocumentStaleness>({
    queryKey: translationKeys.legacy.staleness(collection, id),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        try {
          const response = await ofetch<{ data: DocumentStaleness }>(
            `/api${basePath}/stale/${collection}/${id}`,
            { method: "get", signal }
          );
          return response.data;
        } catch (error) {
          if (isNotFound(error)) return NOTHING_TO_REPORT;
          throw error;
        }
      });
    },
    enabled: options?.enabled,
  });
}
