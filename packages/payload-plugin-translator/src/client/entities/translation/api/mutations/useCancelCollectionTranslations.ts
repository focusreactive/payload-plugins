import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";

interface Variables {
  collection: string;
}

export function useCancelCollectionTranslations() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch(`/api${basePath}/cancel-by-collection/${variables.collection}`, {
          method: "delete",
        })
      );
    },
    mutationKey: ["cancel-collection-translations"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collection-translation-status"],
      });
    },
  });
}
