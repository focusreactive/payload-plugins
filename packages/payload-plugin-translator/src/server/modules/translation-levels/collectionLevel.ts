import { BulkDocumentTranslationDashboard } from "../../../client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export";

import type { TranslationLevel } from "./types";
import { useDocTranslationApi } from "./useDocTranslationApi";

/**
 * Bulk collection translation: a dashboard on the list view (translate many
 * documents at once), backed by the same shared document-translation API as
 * {@link documentLevel}.
 *
 * @since 0.5.0
 * @returns An opaque {@link TranslationLevel} to list in `translatorPlugin({ levels })`.
 * @example
 * ```ts
 * // Enable only bulk collection translation (no per-document popup):
 * translatorPlugin({ collections: [Posts], translationProvider, runner, levels: [collectionLevel()] })
 * ```
 */
export function collectionLevel(): TranslationLevel {
  return {
    extend(ctx) {
      useDocTranslationApi(ctx);
      ctx.addCollectionComponent(
        "beforeListTable",
        () => new BulkDocumentTranslationDashboard(ctx.access)
      );
    },
  };
}
