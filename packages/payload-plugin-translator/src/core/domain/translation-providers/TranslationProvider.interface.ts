/**
 * Numeric index used as key in translation input and output.
 * Represents the position of text in the original document structure.
 */
export type TranslationIndex = number;

/**
 * Identifies one segment of a rich-text paragraph, unique within its value.
 */
export type SegmentId = number;

/**
 * One piece of a rich-text paragraph, carrying one run of formatting. `text: null` is a line break
 * or an inline block: it holds a position and may move, but has nothing to translate.
 */
export type Segment = { id: SegmentId; text: string | null };

/**
 * One value to translate: `segments` (in source order) for a rich-text paragraph whose pieces may
 * reorder, `text` for everything else.
 */
export type TranslatableValue =
  | { kind: "text"; text: string }
  | { kind: "segments"; segments: readonly Segment[] };

export type TranslationInput = Readonly<Record<TranslationIndex, TranslatableValue>>;

/** What a provider answers when it will not, or cannot, translate one value. */
export type ProviderValueFailureCode = "malformed" | "refused" | "untranslatable";

/** What the plugin's own check of an answer concludes. */
export type PluginValueFailureCode =
  | "missing-segment"
  | "unknown-segment"
  | "repeated-segment"
  | "no-text"
  | "wrong-kind";

/** Why one value was not translated. A failure of the whole call is a throw instead. */
export type ValueFailureCode = ProviderValueFailureCode | PluginValueFailureCode;

/**
 * The answer to one value, in the kind it was asked in, or `failed` — the value keeps its source text,
 * and `message` goes to the server log.
 *
 * `segments` carries every id of the value exactly once, in target-language order. An empty `text`
 * merges the segment into a neighbour; text answered for a `null` segment is ignored.
 */
export type TranslatedValue =
  | { kind: "text"; text: string }
  | { kind: "segments"; segments: readonly { id: SegmentId; text: string }[] }
  | { kind: "failed"; code: ValueFailureCode; message?: string };

/**
 * Output of a translation request.
 *
 * Keys are a **subset** of the input's: a key that is absent was not translated, and the plugin
 * keeps the source text for it. An absent key never means "translated to nothing" — to blank a
 * value, answer `{ kind: "text", text: "" }`; a segments answer with no text fails as `no-text`.
 */
export type TranslationOutput = Record<TranslationIndex, TranslatedValue>;

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
 * A language code, e.g. 'en'. Never empty.
 */
export type LanguageCode = string;

/**
 * What the plugin tells a provider about one translation request, beyond the text itself.
 *
 * @since 1.0.0
 */
export type TranslationRequest = {
  sourceLng: LanguageCode;
  targetLng: LanguageCode;
  document: DocumentRef;
};

/**
 * A thrown error that is not one of this package's provider errors is re-wrapped and its `code`
 * replaced, so only those classes carry a {@link TranslationFailureCode} through.
 */
export interface TranslationProvider {
  translate(input: TranslationInput, request: TranslationRequest): Promise<TranslationOutput>;
}
