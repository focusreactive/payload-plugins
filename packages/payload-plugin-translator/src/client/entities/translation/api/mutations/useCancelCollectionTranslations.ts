import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config/index.js";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError.js";

type Variables = {
  collection: string;
};

export function useCancelCollectionTranslations() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationKey: ["cancel-collection-translations"],
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch(`/api${basePath}/cancel`, {
          method: "delete",
          body: { collection_slug: variables.collection, select_all: true },
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-translation-status"] });
    },
  });
}
