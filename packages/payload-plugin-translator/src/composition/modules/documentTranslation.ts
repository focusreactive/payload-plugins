import { hasDraftsEnabled } from "payload/shared";

import { sourceFingerprinter } from "../../core/domain/content-projection/sourceFingerprinter.js";
import { translatablePathsIn } from "../../server/features/_lib/index.js";
import { createTranslationRoutes } from "../../server/features/createTranslationRoutes.js";
import type { TranslationModule } from "../../server/modules/plugin-config/index.js";

/**
 * The document-translation API — queue a run, start it now, cancel it, read its status.
 *
 * @since 1.0.0
 */
export function documentTranslation(): TranslationModule {
  return {
    name: "document-translation",
    setup(ctx) {
      ctx.addEndpoints(
        createTranslationRoutes({
          taskRunnerFactory: ctx.taskRunnerFactory,
          runRecordStoreFactory: ctx.runRecordStoreFactory,
          collectionConfig: {
            availableCollections: new Set(ctx.collections.map((collection) => collection.slug)),
            keepsDrafts: new Set(
              ctx.collections
                .filter((collection) => hasDraftsEnabled({ versions: collection.versions }))
                .map((collection) => collection.slug)
            ),
          },
          schemaMap: ctx.schemaMap,
          translatablePaths: translatablePathsIn(ctx.schemaMap),
          state: {
            fingerprintOf: sourceFingerprinter(ctx.schemaMap, ctx.walk),
            ...(ctx.provenance ? { provenance: ctx.provenance } : {}),
          },
          access: ctx.access,
          settings: ctx.settings,
        })
      );
    },
  };
}
