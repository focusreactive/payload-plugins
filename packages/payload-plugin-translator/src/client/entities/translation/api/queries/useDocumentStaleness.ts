import { useQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CollectionSlug } from "payload";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";
import type { DocumentStaleness } from "../../model/types";

type Props = {
  collection: CollectionSlug;
  id: string;
};

type Options = {
  enabled?: boolean;
};

export const DOCUMENT_STALENESS_QUERY_KEY = "document-staleness";

const getQueryKey = ({ collection, id }: Props) => [DOCUMENT_STALENESS_QUERY_KEY, collection, id];

/**
 * Reads per-locale staleness for a document (#50). Computed lazily on the server, so there is no
 * polling — it refetches on mount / window focus and whenever the dismiss mutation invalidates its
 * key. Reports nothing when provenance is disabled.
 */
export function useDocumentStaleness({ collection, id }: Props, options?: Options) {
  const { basePath } = useTranslateKitConfig();

  return useQuery<DocumentStaleness>({
    queryKey: getQueryKey({ collection, id }),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        const response = await ofetch<{ data: DocumentStaleness }>(
          `/api${basePath}/stale/${collection}/${id}`,
          { method: "get", signal }
        );
        return response.data;
      });
    },
    enabled: options?.enabled,
  });
}
