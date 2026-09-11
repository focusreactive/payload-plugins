/**
 * Numeric index used as key in translation input and output.
 * Represents the position of text in the original document structure.
 */
export type TranslationIndex = number;

/**
 * Input map of text content for translation.
 * Keys are numeric indices that must be preserved in the output.
 * Values are the text strings to translate.
 *
 * @example
 * { 0: "Hello", 1: "World", 2: "Welcome to our site" }
 */
export type TranslationInput = Record<TranslationIndex, string>;

/**
 * Output of translation operation.
 * Must have the same keys as input, with translated values.
 *
 * @example
 * // Input: { 0: "Hello", 1: "World" }
 * // Output: { 0: "Привет", 1: "Мир" }
 */
export type TranslationOutput = Record<TranslationIndex, string>;

/**
 * What the core can tell a provider about the request beyond the text itself.
 *
 * Optional, so every implementation written before it keeps compiling and working.
 *
 * @since 0.12.0
 */
export type TranslationRequestOptions = {
  /**
   * The values carry numbered inline marks the provider must preserve.
   *
   * Stated rather than sniffed: customer text can legitimately contain `<1>` — a footnote
   * reference, a template placeholder, an article about markup — and inferring from content
   * would change the prompt for documents that opted into nothing.
   */
  inlineMarks?: boolean;
};

/**
 * Interface for translation service providers.
 *
 * Implementations must:
 * - Preserve all numeric keys from input
 * - Return translated text values for each key
 * - Return null on translation failure
 * - Handle empty input gracefully
 *
 * @example
 * ```typescript
 * class MyProvider implements TranslationProvider {
 *   async translate(input, sourceLng, targetLng) {
 *     // Input:  { 0: "Hello", 1: "World" }
 *     // Output: { 0: "Bonjour", 1: "Monde" }
 *     const output = await myTranslationAPI.translate(input, targetLng)
 *     return output
 *   }
 * }
 * ```
 */
export interface TranslationProvider {
  /**
   * What this provider can be asked to do beyond plain translation. Absent means "nothing extra" —
   * every provider written before a capability existed keeps working unchanged.
   *
   * @since 0.12.0
   */
  capabilities?: {
    /**
     * The provider preserves numbered inline marks (`<1>text</1>`) in the values it returns,
     * keeping every number exactly once and moving them where the target language needs them.
     *
     * Declare it only for a language model that was instructed accordingly. A machine-translation
     * API would translate or strip the marks, so without this declaration the core keeps
     * translating rich text node by node whatever the plugin config says.
     */
    inlineMarks?: boolean;
  };
  /**
   * Translates indexed text content from source to target language.
   *
   * @param input - Map of index to text string. Keys must be preserved in output.
   * @param sourceLng - Source language code (e.g., 'en', 'de'). May be empty for auto-detect.
   * @param targetLng - Target language code (e.g., 'fr', 'es').
   * @returns Translated output with same keys, or null on failure.
   */
  translate(
    input: TranslationInput,
    sourceLng: string,
    targetLng: string,
    options?: TranslationRequestOptions
  ): Promise<TranslationOutput | null>;
}
