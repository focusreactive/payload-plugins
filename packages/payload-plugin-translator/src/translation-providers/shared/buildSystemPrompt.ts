/**
 * Context handed to a {@link SystemPromptBuilder}.
 *
 * @since 0.11.0
 */
export type SystemPromptContext = {
  /** Source language code (e.g. 'en', 'de'). Empty when the provider should auto-detect. */
  sourceLang: string;
  targetLang: string;
  defaultPrompt: string;
};

/**
 * Builds a custom system prompt for translation.
 *
 * @since 0.11.0
 */
export type SystemPromptBuilder = (context: SystemPromptContext) => string;

/**
 * Produces the system prompt sent with a translation request.
 *
 * The default wording is handed to `systemPrompt` builders as `defaultPrompt`, so consumers extend
 * this exact string — changing it changes every custom prompt built on it.
 *
 * @since 0.11.0
 */
export function buildSystemPrompt(args: {
  sourceLng: string;
  targetLng: string;
  override?: SystemPromptBuilder;
}): string {
  const { sourceLng, targetLng, override } = args;

  const defaultPrompt = `Translate the values from the JSON that the user will send you${
    sourceLng ? ` from ${sourceLng}` : ""
  } into ${targetLng}. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

  if (override) {
    return override({ sourceLang: sourceLng, targetLang: targetLng, defaultPrompt });
  }

  return defaultPrompt;
}
