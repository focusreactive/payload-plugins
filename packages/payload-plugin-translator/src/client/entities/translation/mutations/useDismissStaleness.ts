import { useMutation } from "@tanstack/react-query";

import type { DocumentId, LocaleCode } from "../../../../types/wire/primitives.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import type { CollectionSlug } from "../model/TranslationRepository.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = {
  collection: CollectionSlug;
  id: DocumentId;
  target_lng: LocaleCode;
};

/** Hides the out-of-date notice of one target locale until the source changes again (#50). */
export function useDismissStaleness() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ collection, id, target_lng }: Variables): Promise<void> =>
      repository.dismissStaleness({ collection_slug: collection, collection_id: id, target_lng }),
    onSettled: () => refresh(),
  });
}
