import { getAutoTranslateConfig } from "../../../core/domain/auto-translate/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import type { TaskRunnerFactory } from "../task-runner/index.js";

import {
  extractLocaleCodes,
  filterPolicyToKnownLocales,
  makeCollectionPolicyResolver,
  normalizeAutoTranslateConfig,
} from "./AutoTranslate.policy.js";
import type { LocalizationLike, NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy.js";
import {
  injectAutoTranslateHook,
  makeAutoTranslateHook,
  propagateAutoTranslateCustom,
} from "./AutoTranslateEnqueue.hook.js";

/** A collection as the plugin receives it — only `slug` + `custom` are read to resolve the opt-in. */
type ConfigurableCollection = { slug: string; custom?: Record<string, unknown> };

/** Everything the auto-translate module contributes at config time (mirrors `ProvenanceModule`). */
export type AutoTranslateModule = {
  configure(managedSlugs: Set<string>): ConfigModifier;
};

const NOOP: ConfigModifier = (config) => config;

/** Emit one clear config-time warning per collection whose auto-translate config named unknown locales. */
function warnDroppedLocales(
  slug: string,
  filtered: ReturnType<typeof filterPolicyToKnownLocales>,
  knownLocales: Set<string>
): void {
  const known = [...knownLocales].join(", ");
  if (filtered.droppedTargets.length > 0) {
    console.warn(
      `[payload-plugin-translator] auto-translate on "${slug}": ignoring unknown target locale(s) ${filtered.droppedTargets.join(", ")} (configured locales: ${known}).`
    );
  }
  if (filtered.droppedSourceLocale) {
    console.warn(
      `[payload-plugin-translator] auto-translate on "${slug}": unknown sourceLocale "${filtered.droppedSourceLocale}" ignored, falling back to the default locale (configured locales: ${known}).`
    );
  }
}

/**
 * Runs while the config is still being built, so a locale nobody configured is dropped before the
 * first hook can enqueue a translation for it — after that it would cost provider calls and leave
 * translations under a locale the project cannot serve.
 */
function dropLocalesTheProjectDoesNotHave(
  config: { localization?: LocalizationLike },
  slugs: Set<string>,
  policies: Map<string, NormalizedAutoTranslatePolicy>
): void {
  const knownLocales = extractLocaleCodes(config.localization);
  if (!knownLocales) {
    if (slugs.size > 0) {
      console.warn(
        "[payload-plugin-translator] auto-translate is configured but localization is disabled; no translations will be enqueued."
      );
    }
    return;
  }
  for (const slug of slugs) {
    const policy = policies.get(slug);
    if (!policy) continue;
    const filtered = filterPolicyToKnownLocales(policy, knownLocales);
    warnDroppedLocales(slug, filtered, knownLocales);
    policies.set(slug, filtered.policy);
  }
}

/**
 * Turn the opt-in `withAutoTranslate` config (read from each collection's `custom`) into a
 * self-contained {@link AutoTranslateModule} — mirrors `configureProvenance`. Builds the per-collection
 * policy map + resolver once, then returns a `configure(managedSlugs) → ConfigModifier` that injects a
 * single best-effort `afterChange` hook onto every enabled + managed collection. When no collection
 * opted in, `configure` is a no-op (no hook, no behaviour change).
 */
export function configureAutoTranslate(
  collections: ConfigurableCollection[],
  schemaMap: CollectionSchemaMap,
  taskRunnerFactory: TaskRunnerFactory
): AutoTranslateModule {
  const policies = new Map<string, NormalizedAutoTranslatePolicy>();
  for (const collection of collections) {
    const config = getAutoTranslateConfig(collection);
    if (config) policies.set(collection.slug, normalizeAutoTranslateConfig(config));
  }
  if (policies.size === 0) return { configure: () => NOOP };

  const enabledSlugs = new Set(policies.keys());
  const resolvePolicy = makeCollectionPolicyResolver(policies);
  const hook = makeAutoTranslateHook({ resolvePolicy, schemaMap, taskRunnerFactory });

  return {
    configure:
      (managedSlugs: Set<string>): ConfigModifier =>
      (config) => {
        const slugs = new Set([...enabledSlugs].filter((slug) => managedSlugs.has(slug)));
        dropLocalesTheProjectDoesNotHave(config, slugs, policies);
        injectAutoTranslateHook(config, slugs, hook);
        propagateAutoTranslateCustom(config, slugs, policies);
        return config;
      },
  };
}
