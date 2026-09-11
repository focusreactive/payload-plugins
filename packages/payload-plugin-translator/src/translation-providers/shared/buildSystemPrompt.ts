/**
 * Wording validated against 396 live translations (French, German, Japanese × four models) before
 * it shipped: the fallback rate was ~1% on gpt-4o and zero on newer models. Reword it only with
 * the same measurement in hand.
 */
const INLINE_MARKS_INSTRUCTION = `Some values contain numbered inline marks, written as <1>text</1> or <5/>. They carry formatting, not content.
Return every mark exactly once, keeping its number, and put each mark where the translated sentence needs it — the order of marks may change.
If a piece of text merges into a neighbouring mark, return the emptied mark as <2></2>; never omit a mark.
Never introduce a mark into a value that has none, and never nest marks.`;

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
 */
export function buildSystemPrompt(args: {
  sourceLng: string;
  targetLng: string;
  override?: SystemPromptBuilder;
  /**
   * Whether the values being sent carry inline marks. Appended **after** whatever `override`
   * returns: a builder is free to ignore `defaultPrompt`, and the format must not depend on it
   * remembering to include this rule.
   */
  hasInlineMarks?: boolean;
}): string {
  const { sourceLng, targetLng, override, hasInlineMarks } = args;

  const defaultPrompt = `Translate the values from the JSON that the user will send you${
    sourceLng ? ` from ${sourceLng}` : ""
  } into ${targetLng}. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

  const prompt = override
    ? override({ sourceLang: sourceLng, targetLang: targetLng, defaultPrompt })
    : defaultPrompt;

  return hasInlineMarks ? `${prompt}\n\n${INLINE_MARKS_INSTRUCTION}` : prompt;
}
