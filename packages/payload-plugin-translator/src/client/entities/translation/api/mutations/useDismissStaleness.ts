import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import type { CollectionSlug } from "payload";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";
import { DOCUMENT_STALENESS_QUERY_KEY } from "../queries/useDocumentStaleness";

type Variables = {
  collection: CollectionSlug;
  id: string;
  target_lng: string;
};

/**
 * Dismisses (acknowledges) staleness of one target locale, then refreshes the staleness query so the
 * indicator disappears until the source changes again (#50).
 */
export function useDismissStaleness() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationKey: ["dismiss-staleness"],
    mutationFn: async ({ collection, id, target_lng }: Variables): Promise<void> => {
      await handleNextApiError(() => {
        return ofetch<{ data: { success: boolean } }>(`/api${basePath}/stale/dismiss`, {
          method: "post",
          body: { collection_slug: collection, collection_id: id, target_lng },
        });
      });
    },
    onSuccess: (_data, { collection, id }) => {
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_STALENESS_QUERY_KEY, collection, id] });
    },
  });
}
