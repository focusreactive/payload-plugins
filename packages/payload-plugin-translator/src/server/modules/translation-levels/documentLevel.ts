import { TranslateDocumentExport } from "../../../client/widgets/translate-document";

import type { TranslationLevel } from "./types";
import { useDocTranslationApi } from "./useDocTranslationApi";

/**
 * Per-document translation: a popup control on the document edit view, backed by
 * the shared document-translation API (async/job by default; synchronous if the
 * configured `runner` is a sync runner).
 *
 * @since 0.5.0
 * @returns An opaque {@link TranslationLevel} to list in `translatorPlugin({ levels })`.
 * @example
 * ```ts
 * translatorPlugin({
 *   collections: [Posts],
 *   translationProvider,
 *   runner: createPayloadJobsRunner(),
 *   levels: [documentLevel(), collectionLevel()], // this is the default — omit for the same result
 * })
 * ```
 */
export function documentLevel(): TranslationLevel {
  return {
    extend(ctx) {
      useDocTranslationApi(ctx);
      ctx.addCollectionComponent("beforeDocumentControls", (collection) => new TranslateDocumentExport(collection, ctx.access));
    },
  };
}
