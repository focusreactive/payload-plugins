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
import type {
  TranslationComponent,
  TranslationModule,
} from "./server/modules/plugin-config/index.js";
import { PluginConfigBuilder } from "./server/modules/plugin-config/PluginConfigBuilder.js";
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
   * Which server modules to enable, as factories — `documentTranslation()`, `fieldTranslation()`.
   * Required, and `[]` is a real answer: auto-translate needs no route at all.
   *
   * @since 1.0.0 — replaces `levels`.
   */
  modules: TranslationModule[];
  /**
   * Which admin controls to attach, as factories — `translateDocumentControl()`,
   * `bulkTranslationDashboard()`. Required, and `[]` is a real answer for a headless setup.
   *
   * A control calls its module's routes, so list that module in `modules` too.
   *
   * @since 1.0.0 — split out of `levels`.
   */
  components: TranslationComponent[];
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
 * A module's name keys its slot in the run's `moduleState`, so two modules sharing one would share
 * the slot: the second overwrites, and the first reads back a value that is not its own.
 */
function refuseDuplicateNames(chain: readonly TranslationModule[]): void {
  const seen = new Set<string>();
  for (const member of chain) {
    if (seen.has(member.name)) {
      throw new Error(
        `payload-plugin-translator: two modules are named "${member.name}". ` +
          "Module names must differ — each one keys its own state for the duration of a run."
      );
    }
    seen.add(member.name);
  }
}

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
    const { access, translationProvider, runner, collections, provenance, lifecycle } =
      pluginConfig;
    const { modules, components } = pluginConfig;
    const settings = resolveSettings(pluginConfig);

    // Required by the type, so only a plain-JavaScript caller reaches this.
    if (!access) {
      throw new Error(
        "payload-plugin-translator: `access` is required. Pass an access guard, or " +
          "`new AnyAccessGuard()` to leave the translation endpoints open on purpose."
      );
    }

    if (!modules || !components) {
      throw new Error(
        "payload-plugin-translator: `modules` and `components` are both required, and `[]` is a " +
          "valid answer for either. `levels` is gone: `documentLevel()` becomes " +
          "`modules: [documentTranslation()]` plus `components: [translateDocumentControl()]`, " +
          "`collectionLevel()` becomes the same module plus " +
          "`components: [bulkTranslationDashboard()]`, and `fieldLevel()` becomes " +
          "`modules: [fieldTranslation()]`."
      );
    }

    const schemaMap: CollectionSchemaMap = new Map(
      collections.map((col) => [col.slug, projectFieldsToFieldLike(col.fields)])
    );
    const collectionSlugs = new Set(schemaMap.keys());

    const provenanceModule = configureProvenance(provenance, schemaMap);

    // Provenance goes first: the staleness route re-hashes the stored source, so a fingerprint
    // taken after another module replaced `sourceData` would never match.
    const chain: TranslationModule[] = provenanceModule ? [provenanceModule, ...modules] : modules;
    refuseDuplicateNames(chain);

    const { taskRunnerFactory, configModifier: runnerConfigModifier } = wireTranslateRunner({
      translationProvider,
      schemaMap,
      modules: chain,
      runner,
      lifecycle: lifecycle ?? {},
      collections: Array.from(collectionSlugs),
    });
    const autoTranslateModule = configureAutoTranslate(collections, schemaMap, taskRunnerFactory);

    const builder = new PluginConfigBuilder({
      collections,
      settings,
      access,
      taskRunnerFactory,
      schemaMap,
      translationProvider,
    });
    for (const member of chain) member.setup?.(builder);
    for (const component of components) component.attach(builder);

    builder.addConfigModifier(runnerConfigModifier);
    builder.addConfigModifier(autoTranslateModule.configure(collectionSlugs));
    builder.addAdminProvider(new CacheProviderExport(settings.basePath));

    return builder.applyTo(payloadConfig);
  };
}
