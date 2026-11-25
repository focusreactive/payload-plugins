import { skipToken, useQuery } from "@tanstack/react-query";

import type { DocumentId } from "../../../../types/wire/primitives.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import type { CollectionSlug } from "../model/TranslationRepository.js";
import { pollWhileRunning } from "./polling.js";
import { translationKeys } from "./translationKeys.js";

/** A document view before its first save has no id yet. */
export type MaybeSavedDocument = { collection: CollectionSlug; id: DocumentId | undefined };

const UNSAVED_DOCUMENT: DocumentId = "";

export function useDocumentTranslationState({ collection, id }: MaybeSavedDocument) {
  const repository = useTranslationRepository();
  return useQuery({
    queryKey: translationKeys.document(collection, id ?? UNSAVED_DOCUMENT),
    queryFn: id === undefined ? skipToken : () => repository.getDocumentState({ collection, id }),
    refetchInterval: ({ state }) => pollWhileRunning(state.data?.locales ?? []),
  });
}
