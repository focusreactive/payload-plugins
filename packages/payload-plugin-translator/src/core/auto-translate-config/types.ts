/**
 * Key under a collection's `custom` bag where its auto-translate rule is stamped by `withAutoTranslate`
 * and read back by {@link getAutoTranslateConfig}. Mirrors the field-level `TRANSLATE_KIT_CUSTOM_KEY`
 * pattern — a single typed key so writer and reader never diverge.
 */
export const AUTO_TRANSLATE_CUSTOM_KEY = "translatorAutoTranslate";

/**
 * Translation strategy for auto-enqueued jobs (matches the task-runner's strategy union):
 * - `"overwrite"` — (re)translate every target field, replacing any existing target-locale value.
 * - `"skip_existing"` — only fill target fields that are currently empty, leaving existing translations
 *   untouched.
 * @since 0.9.0
 */
export type AutoTranslateStrategy = "overwrite" | "skip_existing";

/**
 * A collection's opt-in auto-translate rule (developer-configured, v1). Presence of this config on a
 * collection = opted in; absence = off (the default).
 * @since 0.9.0
 */
export type AutoTranslateConfig = {
  /** Target locales to translate into when the source changes. The source locale is always excluded. */
  targets: string[];
  /** Translation strategy; defaults to `"overwrite"`. */
  strategy?: AutoTranslateStrategy;
  /**
   * Delay (ms) before the queued job runs, coalescing rapid edits via the job runner's
   * per-(document, locale) supersession. `0`/omitted = enqueue immediately.
   */
  debounceMs?: number;
  /** Override the source locale for this collection; defaults to `localization.defaultLocale`. */
  sourceLocale?: string;
};
