import { skipToken, useQuery } from "@tanstack/react-query";

import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import type { ListStateRequest } from "../model/TranslationRepository.js";
import { pollWhileRunning } from "./polling.js";
import { translationKeys } from "./translationKeys.js";

/** One request for the whole page; a page with no ids sends none. */
export function useListTranslationState({ collection, ids }: ListStateRequest) {
  const repository = useTranslationRepository();
  return useQuery({
    queryKey: translationKeys.list(collection, ids.join(",")),
    queryFn: ids.length === 0 ? skipToken : () => repository.getListState({ collection, ids }),
    refetchInterval: ({ state }) =>
      pollWhileRunning(state.data?.docs.flatMap(({ locales }) => locales) ?? []),
  });
}
