import { BulkDocumentTranslationDashboard } from "../../client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export.js";
import type { TranslationComponent } from "../../server/modules/plugin-config/index.js";

/**
 * The bulk dashboard on the list view. Calls `documentTranslation()`'s routes, so list that module
 * too.
 *
 * @since 1.0.0
 */
export function bulkTranslationDashboard(): TranslationComponent {
  return {
    attach(ctx) {
      ctx.addCollectionComponent(
        "beforeListTable",
        () => new BulkDocumentTranslationDashboard(ctx.access, ctx.settings.targetSelection)
      );
    },
  };
}
