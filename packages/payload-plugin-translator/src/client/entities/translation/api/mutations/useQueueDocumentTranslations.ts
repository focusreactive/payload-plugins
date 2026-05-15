import { useMutation } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";

interface Variables {
  source_lng: string;
  target_lng: string;
  collection_slug: string;
  collection_id: Array<string | number>;
}

export function useQueueDocumentTranslations() {
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch<{ data: null }>(`/api${basePath}/enqueue-many`, {
          method: "post",
          body: variables,
        })
      );
    },
    mutationKey: ["queue-document-translations"],
  });
}
