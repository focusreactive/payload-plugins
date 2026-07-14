import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CollectionSlug } from "payload";
import { useCallback, useEffect, useRef } from "react";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";
import { DOCUMENT_STALENESS_QUERY_KEY } from "./useDocumentStaleness";
import type { DocumentTranslation } from "../../model/types";

type Props = {
  collection: CollectionSlug;
  id: string;
};

type Options = {
  enabled?: boolean;
};

const getDocumentTranslationQueryKey = ({ collection, id }: Props) => {
  return ["document-translation-status", collection, id];
};

const POLLING_INTERVAL_MILLISECONDS = 20000; // 20 sec

export function useDocumentTranslation({ collection, id }: Props, options?: Options) {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  const query = useQuery<DocumentTranslation, Error, DocumentTranslation>({
    queryKey: getDocumentTranslationQueryKey({ collection, id }),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        const response = await ofetch<{ data: DocumentTranslation }>(
          `/api${basePath}/document/${collection}/${id}`,
          {
            method: "get",
            signal,
          }
        );

        return response.data;
      });
    },
    enabled: options?.enabled,
    refetchInterval: (query) => {
      return query.state.data?.status === "failed" || query.state.data?.status === "completed"
        ? false
        : POLLING_INTERVAL_MILLISECONDS;
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getDocumentTranslationQueryKey({ collection, id }) });
  }, [collection, id, queryClient]);

  // When a queued (async) translation transitions to "completed" in-session, the provenance
  // record's sourceFingerprint has just been updated server-side — invalidate staleness so the
  // "Out of date" notice clears without waiting for the next focus/remount refetch (#50).
  // Seeded lazily (undefined) and gated on a *defined, non-completed → completed* transition, so a
  // cold mount of an already-completed document does NOT fire a spurious extra refetch.
  const previousStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const currentStatus = query.data?.status;
    if (
      currentStatus === "completed" &&
      previousStatus !== undefined &&
      previousStatus !== "completed"
    ) {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_STALENESS_QUERY_KEY] });
    }
    previousStatusRef.current = currentStatus;
  }, [query.data?.status, queryClient]);

  return { ...query, invalidate };
}
