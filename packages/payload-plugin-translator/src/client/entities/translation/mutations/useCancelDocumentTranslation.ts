import { useMutation } from "@tanstack/react-query";

import type { CancelResponse } from "../../../../types/wire/ActionBodies.js";
import type { DocumentAddress } from "../model/TranslationRepository.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = { document: DocumentAddress };

export function useCancelDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ document }: Variables): Promise<CancelResponse> => repository.cancel(document),
    onSettled: () => refresh(),
  });
}
