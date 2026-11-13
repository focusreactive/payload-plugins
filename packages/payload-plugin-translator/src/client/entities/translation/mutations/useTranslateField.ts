import { useMutation } from "@tanstack/react-query";

import type { FieldTranslationResult } from "../../../../types/wire/field-translation.js";
import type { LocaleCode } from "../../../../types/wire/primitives.js";
import { useTranslationRepository } from "../api/TranslationRepositoryContext.js";
import type { CollectionSlug } from "../model/TranslationRepository.js";
import { useRefreshTranslation } from "../queries/useRefreshTranslation.js";

type Variables = {
  collectionSlug: CollectionSlug;
  fieldPath: string;
  targetLng: LocaleCode;
  /** The server reads the field's saved value in this locale. */
  sourceLng: LocaleCode;
  /** The saved document the source value is read from. */
  docId: string | number;
};

/**
 * Translates one field synchronously. Nothing is persisted: the caller writes the result into
 * form state.
 */
export function useTranslateField() {
  const repository = useTranslationRepository();
  const refresh = useRefreshTranslation();

  return useMutation({
    mutationFn: (variables: Variables): Promise<FieldTranslationResult> =>
      repository.translateField({
        collection_slug: variables.collectionSlug,
        field_path: variables.fieldPath,
        target_lng: variables.targetLng,
        source_lng: variables.sourceLng,
        doc_id: String(variables.docId),
      }),
    onSettled: () => refresh(),
  });
}
