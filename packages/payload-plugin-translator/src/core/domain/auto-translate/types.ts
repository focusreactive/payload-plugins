export const AUTO_TRANSLATE_CUSTOM_KEY = "translatorAutoTranslate";

/**
 * A collection's opt-in auto-translate rule. Present = opted in; absent = off.
 * @since 0.9.0
 */
export type AutoTranslateConfig = {
  /** The source locale is always excluded. */
  targets: string[];
  /**
   * Delay (ms) before the queued job runs, coalescing rapid edits via the job runner's
   * per-(document, locale) supersession. `0`/omitted = enqueue immediately.
   */
  debounceMs?: number;
  /** Defaults to `localization.defaultLocale`. */
  sourceLocale?: string;
};
