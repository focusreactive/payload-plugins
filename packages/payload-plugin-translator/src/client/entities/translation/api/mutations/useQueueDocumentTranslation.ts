import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";

type TranslationStrategy = "overwrite" | "skip_existing";

interface Variables {
  source_lng: string;
  target_lng: string;
  collection_slug: string;
  collection_id: Array<string | number>;
  select_all?: boolean;
  strategy?: TranslationStrategy;
  publish_on_translation?: boolean;
}

export function useQueueDocumentTranslation() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch<{ data: null }>(`/api${basePath}/enqueue`, {
          method: "post",
          body: variables,
        })
      );
    },
    mutationKey: ["queue-document-translation"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-translation-status"],
      });
      queryClient.invalidateQueries({
        queryKey: ["collection-translation-status"],
      });
    },
  });
}
