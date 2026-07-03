import { createFieldRoute } from "../../server/features/translate-field";

import type { LevelContext, TranslationLevel } from "../../server/modules/translation-levels";

/**
 * Field-level translation surface: a synchronous `POST {basePath}/field` endpoint that translates
 * a single declared field **from a chosen source locale** — it reads the field's value from the
 * saved document in that locale and translates it into the active locale. No runner, no queue, no
 * persistence. Unlike `documentLevel` / `collectionLevel`, it contributes no admin component: the
 * per-field control UI is wired separately at field-declaration time via `withFieldTranslation(field)`.
 *
 * Not part of the default `levels`, so it stays strictly opt-in.
 *
 * @returns an opaque {@link TranslationLevel} to list in `translatorPlugin({ levels })`
 * @since 0.6.0
 * @example
 * ```ts
 * translatorPlugin({
 *   collections: [Posts],
 *   translationProvider: createOpenAIProvider({ apiKey: process.env.OPENAI_API_KEY }),
 *   runner: createPayloadJobsRunner(),
 *   levels: [documentLevel(), fieldLevel()],
 * });
 * ```
 */
export function fieldLevel(): TranslationLevel {
  return {
    extend(ctx: LevelContext) {
      ctx.addEndpoints([
        createFieldRoute({
          schemaMap: ctx.schemaMap,
          translationProvider: ctx.translationProvider,
          access: ctx.access,
          basePath: ctx.basePath,
        }),
      ]);
    },
  };
}
