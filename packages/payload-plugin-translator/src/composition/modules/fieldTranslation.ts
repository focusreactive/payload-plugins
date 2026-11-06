import { createFieldRoute } from "../../server/features/translate-field/index.js";
import type { TranslationModule } from "../../server/modules/plugin-config/index.js";

/**
 * A synchronous `POST {basePath}/field`: one declared field, read from the *saved* document —
 * nothing queued, nothing persisted. Its control comes from `withFieldTranslation(field)`, not from
 * `components`.
 *
 * @since 1.0.0
 */
export function fieldTranslation(): TranslationModule {
  return {
    name: "field-translation",
    setup(ctx) {
      ctx.addEndpoints([
        createFieldRoute({
          schemaMap: ctx.schemaMap,
          translationProvider: ctx.translationProvider,
          access: ctx.access,
          basePath: ctx.settings.basePath,
        }),
      ]);
    },
  };
}
