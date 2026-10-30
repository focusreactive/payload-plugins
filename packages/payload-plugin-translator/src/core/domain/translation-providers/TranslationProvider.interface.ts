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
 * Output of a translation request.
 *
 * Keys are a **subset** of the input's: a key that is absent was not translated, and the plugin
 * keeps the source text for it. An absent key never means "translated to nothing" — to blank a
 * value, return the empty string under its key.
 */
export type TranslationOutput = Record<TranslationIndex, string>;

/**
 * Failure causes a translation provider can report.
 *
 * @since 0.11.0
 */
export type TranslationFailureCode =
  | "no-content"
  | "unparseable-reply"
  | "key-set-mismatch"
  | "transport"
  | "config";

/**
 * Which document is being translated. Identity, not a switch — the two halves never arrive apart,
 * and neither tells a provider *how* to translate.
 *
 * @since 0.18.0
 */
export type DocumentRef = {
  collection: string;
  id: string;
};

/**
 * What the plugin tells a provider about one translation request, beyond the text itself.
 *
 * @since 1.0.0
 */
export type TranslationRequest = {
  /** Source language code (e.g. 'en', 'de'). Always set: the plugin never sends an empty one. */
  sourceLng: string;
  targetLng: string;
  document: DocumentRef;
  /**
   * The values carry numbered inline marks (`<1>text</1>`, `<5/>`) standing in for formatting, and
   * every mark must come back exactly once.
   *
   * Stated rather than sniffed: customer text can legitimately contain `<1>` — a footnote
   * reference, a template placeholder, an article about markup — and inferring from content would
   * change the prompt for documents that opted into nothing.
   */
  inlineMarks: boolean;
};

/**
 * Interface for translation service providers.
 *
 * Report failure by throwing; a returned value is always taken as success. A failure that is not
 * one of this package's own provider errors is re-wrapped before it reaches the caller and the
 * `code` it carried is replaced, so today only those classes preserve a
 * {@link TranslationFailureCode}.
 */
export interface TranslationProvider {
  /**
   * What this provider can be asked to do beyond plain translation. Absent means "nothing extra" —
   * every provider written before a capability existed keeps working unchanged.
   *
   * @since 0.13.0
   */
  capabilities?: {
    /**
     * The provider preserves numbered inline marks (`<1>text</1>`) in the values it returns,
     * keeping every number exactly once and moving them where the target language needs them.
     *
     * Declare it only for a language model that was instructed accordingly. A machine-translation
     * API would translate or strip the marks, so without this declaration the core translates rich
     * text node by node.
     */
    inlineMarks?: boolean;
  };
  /** Translates indexed text content from source to target language. */
  translate(input: TranslationInput, request: TranslationRequest): Promise<TranslationOutput>;
}
