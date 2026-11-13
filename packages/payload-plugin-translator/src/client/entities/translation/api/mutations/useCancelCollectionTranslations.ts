import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../shared/config/index.js";
import { handleNextApiError } from "../../../../shared/api/handleApiError.js";

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
        ofetch(`/api${basePath}/cancel-by-collection/${variables.collection}`, {
          method: "delete",
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collection-translation-status"] });
    },
  });
}
