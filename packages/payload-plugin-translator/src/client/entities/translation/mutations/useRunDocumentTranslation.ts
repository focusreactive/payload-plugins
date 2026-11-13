import { useMutation } from "@tanstack/react-query";

import type { RunHandle } from "../../../../types/wire/primitives.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = { id: RunHandle };

export function useRunDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ id }: Variables): Promise<void> => repository.runNow(id),
    onSettled: () => void refresh(),
  });
}
