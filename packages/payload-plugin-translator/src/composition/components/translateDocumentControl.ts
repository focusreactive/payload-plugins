import { TranslateDocumentExport } from "../../client/widgets/translate-document/index.js";
import type { TranslationComponent } from "../../server/modules/plugin-config/index.js";

/**
 * The per-document control on every managed collection's edit view. Calls `documentTranslation()`'s
 * routes, so list that module too.
 *
 * @since 1.0.0
 */
export function translateDocumentControl(): TranslationComponent {
  return {
    attach(ctx) {
      ctx.addCollectionComponent(
        "beforeDocumentControls",
        (collection) =>
          new TranslateDocumentExport(collection, ctx.access, ctx.settings.targetSelection)
      );
    },
  };
}
