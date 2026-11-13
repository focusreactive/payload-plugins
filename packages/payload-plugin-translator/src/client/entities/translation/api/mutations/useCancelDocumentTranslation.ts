import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../shared/config/index.js";
import { handleNextApiError } from "../../../../shared/api/handleApiError.js";

type Variables = {
  id: string;
};

export function useCancelDocumentTranslation() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationKey: ["cancel-document-translation"],
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() => {
        return ofetch<{ data: null }>(`/api${basePath}/cancel`, {
          method: "delete",
          body: { ids: [variables.id] },
        });
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-translation-status"] });
    },
  });
}
