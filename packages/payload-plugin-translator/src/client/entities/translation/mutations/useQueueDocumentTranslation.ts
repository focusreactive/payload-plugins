import { useMutation } from "@tanstack/react-query";

import type { EnqueueRequest, EnqueueResponse } from "../../../../types/wire/ActionBodies.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = Omit<EnqueueRequest, "collection_id"> & {
  collection_id: ReadonlyArray<string | number>;
};

function documentIdsOf(ids: Variables["collection_id"]): EnqueueRequest["collection_id"] {
  const [first, ...rest] = ids.map(String);
  if (first === undefined) {
    throw new ApiRequestError("rejected", "Select at least one document to translate");
  }
  return [first, ...rest];
}

export function useQueueDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ collection_id, ...request }: Variables): Promise<EnqueueResponse> =>
      repository.enqueue({ ...request, collection_id: documentIdsOf(collection_id) }),
    onSettled: () => void refresh(),
  });
}
