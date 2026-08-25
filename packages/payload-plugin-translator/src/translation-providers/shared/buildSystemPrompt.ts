/**
 * Context handed to a {@link SystemPromptBuilder}.
 *
 * @since 0.11.0
 */
export type SystemPromptContext = {
  /** Source language code (e.g. 'en', 'de'). Empty when the provider should auto-detect. */
  sourceLang: string;
  /** Target language code (e.g. 'fr', 'es'). */
  targetLang: string;
  /** The prompt this package would send. Extend it, or replace it entirely. */
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
 * The default text is the wording this package has always used; it is kept verbatim because the
 * `systemPrompt` option hands it to callers as `defaultPrompt`, so consumers extend a string they
 * already depend on.
 *
 * The instruction to preserve keys is the *textual* half of key preservation. The structural half is
 * {@link buildResponseSchema}, and the guarantee is `parseAndValidateReply` — a model that ignores
 * both is caught there rather than trusted here.
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
