import { useMutation } from "@tanstack/react-query";

import type { DocumentAddress } from "../model/TranslationRepository.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = { document: DocumentAddress };

export function useRunDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ document }: Variables): Promise<void> => repository.runNow(document),
    onSettled: () => refresh(),
  });
}
