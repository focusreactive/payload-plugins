import type { CollectionConfig } from "payload";

import type { AutoTranslateConfig } from "./core/auto-translate-config";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "./core/auto-translate-config";

export type { AutoTranslateConfig };
export type { AutoTranslateStrategy } from "./core/auto-translate-config";

/**
 * Enable opt-in **auto-translate** for a collection: when a document's source-locale content changes
 * (and is published), the plugin automatically queues translations into the configured target locales.
 * Off by default — a collection is opted in only by wrapping it with this helper. The rule is stamped
 * onto `collection.custom` (the input is not mutated; a new collection is returned), mirroring
 * `withFieldTranslation` at the field level.
 *
 * Behaviour: fires only on a **published** source save (draft/autosave saves are ignored; a collection
 * without drafts treats every save as published); skips when no translatable content actually changed
 * (drift-gate); coalesces rapid edits via `debounceMs`; never re-triggers on its own translation
 * writes; and never fails the editor's save (best-effort).
 *
 * **Requires a working job runner.** Auto-translate only ENQUEUES jobs — they run via the plugin's
 * task runner (`createPayloadJobsRunner`) and its autorun loop. On serverless platforms such as
 * **Vercel**, cron-based autorun may not run automatically, so enqueued translations can sit
 * unexecuted until triggered — e.g. an external cron hitting the run-translation endpoint, or a
 * self-hosted worker. Ensure your deployment actually executes queued jobs before relying on this.
 *
 * @param collection - The collection to opt in.
 * @param config - Target locales (+ optional strategy, debounce, source-locale override).
 * @returns A new collection with the auto-translate rule applied (the input is not mutated).
 *
 * @example
 * ```ts
 * import { withAutoTranslate } from '@focus-reactive/payload-plugin-translator'
 *
 * translatorPlugin({
 *   collections: [withAutoTranslate(Posts, { targets: ['de', 'fr'], debounceMs: 2000 })],
 *   translationProvider,
 *   runner,
 * })
 * ```
 *
 * @since 0.9.0
 */
export function withAutoTranslate(
  collection: CollectionConfig,
  config: AutoTranslateConfig
): CollectionConfig {
  return {
    ...collection,
    custom: {
      ...(collection.custom ?? {}),
      [AUTO_TRANSLATE_CUSTOM_KEY]: config,
    },
  };
}
