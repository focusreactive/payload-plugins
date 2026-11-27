import { useMutation } from "@tanstack/react-query";

import type {
  EnqueueDocumentRequest,
  EnqueueListRequest,
  EnqueueResponse,
} from "../../../../types/wire/ActionBodies.js";
import type { DocumentId } from "../../../../types/wire/primitives.js";
import { ApiRequestError } from "../../../shared/api/errors/ApiRequestError.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type AnyIds = ReadonlyArray<string | number>;

type DocumentVariables = Omit<EnqueueDocumentRequest, "collection_id"> & {
  collection_id: AnyIds;
};

type ListVariables = Omit<EnqueueListRequest, "collection_id"> & { collection_id: AnyIds };

const NOTHING_PICKED = "Select at least one document to translate";

function documentIdsOf(ids: AnyIds): [DocumentId, ...DocumentId[]] {
  const [first, ...rest] = ids.map(String);
  if (first === undefined) throw new ApiRequestError("rejected", NOTHING_PICKED);
  return [first, ...rest];
}

function oneDocumentIdOf(ids: AnyIds): [DocumentId] {
  const [first, ...rest] = documentIdsOf(ids);
  if (rest.length > 0) {
    throw new ApiRequestError("rejected", "This action translates one document at a time");
  }
  return [first];
}

export function useQueueDocumentTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ collection_id, ...request }: DocumentVariables): Promise<EnqueueResponse> =>
      repository.enqueueDocument({ ...request, collection_id: oneDocumentIdOf(collection_id) }),
    onSettled: () => refresh(),
  });
}

export function useQueueListTranslation() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: ({ collection_id, ...request }: ListVariables): Promise<EnqueueResponse> =>
      repository.enqueueList({ ...request, collection_id: documentIdsOf(collection_id) }),
    onSettled: () => refresh(),
  });
}
