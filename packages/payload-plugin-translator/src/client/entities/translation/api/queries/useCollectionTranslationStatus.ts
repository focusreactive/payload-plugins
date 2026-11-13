import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CollectionSlug } from "payload";
import { useCallback } from "react";

import { useTranslateKitConfig } from "../../../../shared/config/index.js";
import { handleNextApiError } from "../../../../shared/api/handleApiError.js";
import { DocumentTranslationStatus } from "../../model/enums.js";
import type {
  CollectionTranslationPanel,
  CollectionTranslationStatus,
  ReportedStatus,
} from "../../model/types.js";

type Props = {
  collection: CollectionSlug;
};

type Options = {
  enabled?: boolean;
};

const getCollectionTranslationQueryKey = ({ collection }: Props) => {
  return ["collection-translation-status", collection];
};

const POLLING_INTERVAL_MILLISECONDS = 20000; // 20 sec

export function useCollectionTranslationStatus({ collection }: Props, options?: Options) {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  const query = useQuery<CollectionTranslationStatus, Error, CollectionTranslationPanel>({
    queryKey: getCollectionTranslationQueryKey({ collection }),
    queryFn: async ({ signal }) => {
      return handleNextApiError(async () => {
        const response = await ofetch<{ data: CollectionTranslationStatus }>(
          `/api${basePath}/collection/${collection}`,
          { method: "get", signal }
        );

        return response.data;
      });
    },
    enabled: options?.enabled,
    refetchInterval: (current) => {
      const docs = current.state.data?.docs ?? [];
      const inFlight = docs.some(
        (doc) =>
          doc.status === DocumentTranslationStatus.PENDING ||
          doc.status === DocumentTranslationStatus.RUNNING
      );
      return inFlight ? POLLING_INTERVAL_MILLISECONDS : false;
    },
    select: (data): CollectionTranslationPanel => {
      const counts: Record<ReportedStatus, number> = {
        [DocumentTranslationStatus.PENDING]: 0,
        [DocumentTranslationStatus.RUNNING]: 0,
        [DocumentTranslationStatus.FAILED]: 0,
      };
      for (const doc of data.docs) {
        if (doc.status in counts) counts[doc.status as ReportedStatus] += 1;
      }
      return { counts, failedWindowMs: data.failed_window_ms };
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: getCollectionTranslationQueryKey({ collection }) });
  }, [collection, queryClient]);

  return { ...query, invalidate };
}
