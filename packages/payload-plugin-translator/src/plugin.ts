import type { CollectionConfig, Config } from "payload";

import { CacheProviderExport } from "./client/app/cache/CacheProvider.export.js";
import { configureAutoTranslate } from "./server/modules/auto-translate/index.js";
import { configureProvenance } from "./server/modules/provenance/index.js";
import type { AccessGuard } from "./types/AccessGuard.js";
import type { CollectionSchemaMap } from "./types/CollectionSchemaMap.js";
import { projectFieldsToFieldLike } from "./core/kernel/field-traversal/index.js";
import type { TranslationProvider } from "./core/domain/translation-providers/index.js";
import type { TaskRunnerProvider } from "./server/modules/task-runner/index.js";
import { wireTranslateRunner } from "./server/features/translate-document/index.js";
import type { TranslationLifecycleCallbacks } from "./server/modules/lifecycle/index.js";
import { documentLevel, collectionLevel } from "./composition/levels/index.js";
import type { TranslationLevel } from "./server/modules/translation-levels/index.js";
import { PluginConfigBuilder } from "./server/modules/translation-levels/PluginConfigBuilder.js";
import { resolveSettings } from "./settings.js";
import type { TranslatorSettingsOptions } from "./settings.js";

export type TranslatorPluginConfig = TranslatorSettingsOptions & {
  /**
   * Original collection configs (same objects passed to buildConfig).
   * IMPORTANT: Must be the original collection objects, NOT sanitized configs from payload.collections.
   * Original schemas preserve `localized: true` on nested fields.
   */
  collections: CollectionConfig[];
  /**
   * Translation provider implementation (e.g., OpenAI, DeepL).
   * Handles the actual text translation.
   */
  translationProvider: TranslationProvider;
  /**
   * Task runner backend for background task execution.
   * Use createPayloadJobsRunner() for Payload Jobs integration.
   */
  runner: TaskRunnerProvider;
  /**
   * Who may call the translation endpoints. Required — there is no default.
   *
   * The endpoints write to your documents and spend money at your translation provider, and Payload
   * does not authenticate custom endpoints for you, so leaving them open is a decision rather than a
   * detail. Pass a guard, or pass `new AnyAccessGuard()` to state that open is what you want.
   *
   * @since 0.14.0 — previously optional, defaulting to open.
   */
  access: AccessGuard;
  /**
   * Which translation surfaces to enable, as level factories — `documentLevel()`,
   * `collectionLevel()`, `fieldLevel()`. Omit for the
   * default `[documentLevel(), collectionLevel()]`, which is exactly today's behaviour.
   * Each level should appear at most once: endpoints are deduplicated, but admin
   * components are not, so a duplicated level renders a duplicated control.
   * @default [documentLevel(), collectionLevel()]
   * @since 0.5.0
   */
  levels?: TranslationLevel[];
  /**
   * Opt-in translation provenance — a durable, per-locale record of what source state each
   * translation was derived from, stored in a plugin-managed sidecar collection. Set `true` (or `{}`)
   * to enable with the default slug, or `{ slug }` to customise it. Omit (or `false`) to disable
   * entirely — no collection, no migration, no behaviour change. **Enabling it on a SQL database adds
   * a table**: generate and run a migration (`payload migrate:create` + `payload migrate`; dev push in
   * development; MongoDB infers it with no migration). The lifecycle callbacks are unaffected by this
   * flag.
   * @since 0.7.0
   */
  provenance?:
    | boolean
    | {
        /**
         * Slug for the sidecar collection. Change it only to resolve a collision with an existing
         * collection.
         * @default 'translator-provenance'
         */
        slug?: string;
      };
  /**
   * Optional server-side lifecycle callbacks fired around each translation task
   * (`onQueued` / `onCompleted` / `onFailed`). Always available — no schema, no migration, not gated
   * by `provenance`. A throwing callback is caught and logged, never failing the translation.
   * @since 0.7.0
   */
  lifecycle?: TranslationLifecycleCallbacks;
};

/**
 * Creates a translation plugin for Payload CMS collections.
 *
 * @example
 * ```ts
 * export default buildConfig({
 *   plugins: [
 *     translatorPlugin({
 *       collections: [Posts, Pages],
 *       translationProvider: createTranslationProvider({
 *         complete: openAIComplete({
 *           client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
 *           model: 'gpt-5.4-mini',
 *         }),
 *       }),
 *       runner: createPayloadJobsRunner(),
 *       access: { check: ({ req }) => Boolean(req.user) },
 *     }),
 *   ],
 * })
 * ```
 */
export function translatorPlugin(
  pluginConfig: TranslatorPluginConfig
): (config: Config) => Promise<Config> {
  return async (payloadConfig) => {
    const { access, translationProvider, runner, collections, levels, provenance, lifecycle } =
      pluginConfig;
    const settings = resolveSettings(pluginConfig);

    // Required by the type, so only a plain-JavaScript caller reaches this.
    if (!access) {
      throw new Error(
        "payload-plugin-translator: `access` is required. Pass an access guard, or " +
          "`new AnyAccessGuard()` to leave the translation endpoints open on purpose."
      );
    }

    const schemaMap: CollectionSchemaMap = new Map(
      collections.map((col) => [col.slug, projectFieldsToFieldLike(col.fields)])
    );
    const collectionSlugs = new Set(schemaMap.keys());

    const provenanceModule = configureProvenance(provenance, schemaMap);

    const { taskRunnerFactory, configModifier: runnerConfigModifier } = wireTranslateRunner({
      translationProvider,
      schemaMap,
      provenanceServiceFactory: provenanceModule.serviceFactory,
      runner,
      lifecycle: lifecycle ?? {},
      collections: Array.from(collectionSlugs),
    });
    const autoTranslateModule = configureAutoTranslate(collections, schemaMap, taskRunnerFactory);

    const activeLevels = levels ?? [documentLevel(), collectionLevel()];
    const builder = new PluginConfigBuilder({
      collections,
      settings,
      access,
      taskRunnerFactory,
      schemaMap,
      translationProvider,
      provenanceServiceFactory: provenanceModule.serviceFactory,
    });
    for (const level of activeLevels) level.extend(builder);

    builder.addConfigModifier(runnerConfigModifier);
    builder.addConfigModifier(provenanceModule.configure(collectionSlugs));
    builder.addConfigModifier(autoTranslateModule.configure(collectionSlugs));
    builder.addAdminProvider(new CacheProviderExport(settings.basePath));

    return builder.applyTo(payloadConfig);
  };
}
