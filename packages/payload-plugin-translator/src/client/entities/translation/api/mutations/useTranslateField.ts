import { useMutation } from "@tanstack/react-query";
import { ofetch } from "ofetch";

import { useTranslateKitConfig } from "../../../../app/config";
import { handleNextApiError } from "../../../../shared/lib/errors/handleApiError";
import type { FieldTranslationResult } from "../../../../../server/features/translate-field";

type Variables = {
  collectionSlug: string;
  fieldPath: string;
  targetLng: string;
  /** Source locale to translate from — the server reads its saved value. */
  sourceLng: string;
  /** Saved document id the source value is read from. */
  docId: string | number;
};

/**
 * Calls the synchronous field-translation endpoint (POST {basePath}/field).
 * Returns the discriminated result; no cache invalidation — the caller writes
 * the value straight to form state, nothing is persisted.
 *
 * From-locale only: the server reads the field's value from the saved document (`docId`) in
 * `sourceLng` and translates it into the active locale.
 */
export function useTranslateField() {
  const { basePath } = useTranslateKitConfig();

  return useMutation({
    mutationKey: ["translate-field"],
    mutationFn: (variables: Variables): Promise<{ data: FieldTranslationResult }> =>
      handleNextApiError(() =>
        ofetch<{ data: FieldTranslationResult }>(`/api${basePath}/field`, {
          method: "post",
          body: {
            collection_slug: variables.collectionSlug,
            field_path: variables.fieldPath,
            target_lng: variables.targetLng,
            source_lng: variables.sourceLng,
            doc_id: variables.docId,
          },
        })
      ),
  });
}
