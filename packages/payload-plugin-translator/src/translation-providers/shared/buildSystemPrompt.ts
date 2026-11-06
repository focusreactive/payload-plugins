import type { DocumentRef, LanguageCode } from "../../core/domain/translation-providers/index.js";
import { inlineMarksInstruction } from "./wire/index.js";

/**
 * Context handed to a {@link SystemPromptBuilder}.
 *
 * @since 0.11.0
 */
export type SystemPromptContext = {
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  defaultPrompt: string;
  /**
   * @since 0.18.0
   * @since 1.0.0 always present.
   */
  document: DocumentRef;
};

/**
 * Builds a custom system prompt for translation.
 *
 * @since 0.11.0
 * @since 0.18.0 may answer with a promise, so a builder can read from the CMS before it answers.
 */
export type SystemPromptBuilder = (context: SystemPromptContext) => string | Promise<string>;

/**
 * Produces the system prompt sent with a translation request.
 *
 * The default wording is handed to `systemPrompt` builders as `defaultPrompt`, so consumers extend
 * this exact string — changing it changes every custom prompt built on it.
 */
export async function buildSystemPrompt(args: {
  sourceLng: string;
  targetLng: string;
  override?: SystemPromptBuilder;
  document: DocumentRef;
  /**
   * The mark instruction is appended **after** whatever `override` returns: a builder may ignore
   * `defaultPrompt`, and the wire format must not depend on it repeating this rule.
   */
  hasInlineMarks?: boolean;
}): Promise<string> {
  const { sourceLng, targetLng, override, hasInlineMarks, document } = args;

  const defaultPrompt = `Translate the values from the JSON that the user will send you from ${sourceLng} into ${targetLng}. Keep all JSON keys exactly as they are, only translate the values.
The response should be a valid JSON object with the same structure and keys as the input, but with translated values.
Maintain any special formatting, placeholders, or variables within the values if they exist.`;

  const prompt = override
    ? await override({
        sourceLang: sourceLng,
        targetLang: targetLng,
        defaultPrompt,
        document,
      })
    : defaultPrompt;

  return hasInlineMarks ? `${prompt}\n\n${inlineMarksInstruction()}` : prompt;
}
