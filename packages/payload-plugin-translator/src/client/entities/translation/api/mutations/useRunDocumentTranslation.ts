import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config/index.js";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError.js";
import { DOCUMENT_STALENESS_QUERY_KEY } from "../queries/useDocumentStaleness.js";

type Variables = {
  id: string;
};

export function useRunDocumentTranslation() {
  const queryClient = useQueryClient();
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationKey: ["run-document-translation"],
    mutationFn: async (variables: Variables): Promise<void> => {
      await handleNextApiError(() =>
        ofetch<{ data: null }>(`/api${basePath}/run/${variables.id}`, {
          method: "post",
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-translation-status"] });
      queryClient.invalidateQueries({ queryKey: [DOCUMENT_STALENESS_QUERY_KEY] });
    },
  });
}
