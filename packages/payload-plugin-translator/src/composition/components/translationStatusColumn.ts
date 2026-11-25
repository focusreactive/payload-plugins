import { TranslationStatusCellExport } from "../../client/widgets/translation-status-column/index.js";
import type { TranslationComponent } from "../../server/modules/plugin-config/index.js";

/** Unlikely to be a host's own: the column is refused on a collection that already has it. */
export const TRANSLATION_STATUS_FIELD = "translatorStatus";

/**
 * A "Translations" column on every managed collection's list: per locale, whether it is translated,
 * queued, translating or failed: one read of the page's list state, shared by every row. The column
 * is a `ui` field, so it holds no data and cannot be filtered on.
 *
 * @since 1.0.0
 */
export function translationStatusColumn(): TranslationComponent {
  return {
    attach(ctx) {
      ctx.addCollectionField(() => ({
        name: TRANSLATION_STATUS_FIELD,
        type: "ui",
        label: "Translations",
        admin: {
          components: { Cell: new TranslationStatusCellExport() },
          disableListColumn: false,
        },
      }));
    },
  };
}
