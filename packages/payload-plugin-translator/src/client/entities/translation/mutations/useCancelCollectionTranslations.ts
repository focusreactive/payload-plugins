import { useMutation } from "@tanstack/react-query";

import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import type { CollectionSlug } from "../model/TranslationRepository.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = { collection: CollectionSlug };

export function useCancelCollectionTranslations() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ collection }: Variables): Promise<void> =>
      repository.cancelByCollection(collection),
    onSettled: () => void refresh(),
  });
}
