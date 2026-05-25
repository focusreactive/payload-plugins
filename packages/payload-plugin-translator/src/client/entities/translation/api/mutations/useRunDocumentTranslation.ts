import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";

interface Variables {
  id: string;
}

export function useRunDocumentTranslation() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch<{ data: null }>(`/api${basePath}/run/${variables.id}`, {
          method: "post",
        })
      );
    },
    mutationKey: ["run-document-translation"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["document-translation-status"],
      });
    },
  });
}
