import { useMutation } from "@tanstack/react-query";

import type { CancelResponse } from "../../../../types/wire/ActionBodies.js";
import type { RunHandle } from "../../../../types/wire/primitives.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = { id: RunHandle };

export function useCancelDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ id }: Variables): Promise<CancelResponse> => repository.cancel([id]),
    onSettled: () => refresh(),
  });
}
