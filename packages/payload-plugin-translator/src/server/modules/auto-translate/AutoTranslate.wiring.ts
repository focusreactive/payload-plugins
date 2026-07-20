import { getAutoTranslateConfig } from "../../../core/auto-translate-config";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";
import type { ConfigModifier } from "../../../types/ConfigModifier";
import type { TaskRunnerFactory } from "../task-runner";

import {
  extractLocaleCodes,
  filterPolicyToKnownLocales,
  makeCollectionPolicyResolver,
  normalizeAutoTranslateConfig,
} from "./AutoTranslate.policy";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy";
import {
  injectAutoTranslateHook,
  makeAutoTranslateHook,
  propagateAutoTranslateCustom,
} from "./AutoTranslateEnqueue.hook";

/** A collection as the plugin receives it — only `slug` + `custom` are read to resolve the opt-in. */
type ConfigurableCollection = { slug: string; custom?: Record<string, unknown> };

/** Everything the auto-translate module contributes at config time (mirrors `ProvenanceModule`). */
export type AutoTranslateModule = {
  configure(managedSlugs: Set<string>): ConfigModifier;
};

const NOOP: ConfigModifier = (config) => config;

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
        // Inject only onto collections that both opted in AND are plugin-managed.
        const slugs = new Set([...enabledSlugs].filter((slug) => managedSlugs.has(slug)));
        // Drop targets / source-locale overrides that are not configured locales, fail-fast with a
        // warning at init — else a mistyped locale silently burns provider calls and orphans data at
        // runtime. Filter the shared `policies` map once here (config-time, before any hook fires), so
        // the hook, the propagated `custom`, and the admin indicator all read the corrected policy.
        const knownLocales = extractLocaleCodes(config.localization);
        if (knownLocales) {
          for (const slug of slugs) {
            const policy = policies.get(slug);
            if (!policy) continue;
            const filtered = filterPolicyToKnownLocales(policy, knownLocales);
            warnDroppedLocales(slug, filtered, knownLocales);
            policies.set(slug, filtered.policy);
          }
        } else if (slugs.size > 0) {
          console.warn(
            "[payload-plugin-translator] auto-translate is configured but localization is disabled; no translations will be enqueued."
          );
        }
        injectAutoTranslateHook(config, slugs, hook);
        // Mirror the opt-in onto the registered collection's `custom` so the admin UI can read it back.
        propagateAutoTranslateCustom(config, slugs, policies);
        return config;
      },
  };
}

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
