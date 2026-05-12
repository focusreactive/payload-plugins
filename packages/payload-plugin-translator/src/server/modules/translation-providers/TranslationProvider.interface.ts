/**
 * Numeric index used as key in translation input and output.
 * Represents the position of text in the original document structure.
 */
export type TranslationIndex = number

/**
 * Input map of text content for translation.
 * Keys are numeric indices that must be preserved in the output.
 * Values are the text strings to translate.
 *
 * @example
 * { 0: "Hello", 1: "World", 2: "Welcome to our site" }
 */
export type TranslationInput = Record<TranslationIndex, string>

/**
 * Output of translation operation.
 * Must have the same keys as input, with translated values.
 *
 * @example
 * // Input: { 0: "Hello", 1: "World" }
 * // Output: { 0: "Привет", 1: "Мир" }
 */
export type TranslationOutput = Record<TranslationIndex, string>

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
   * Translates indexed text content from source to target language.
   *
   * @param input - Map of index to text string. Keys must be preserved in output.
   * @param sourceLng - Source language code (e.g., 'en', 'de'). May be empty for auto-detect.
   * @param targetLng - Target language code (e.g., 'fr', 'es').
   * @returns Translated output with same keys, or null on failure.
   */
  translate(input: TranslationInput, sourceLng: string, targetLng: string): Promise<TranslationOutput | null>
}
