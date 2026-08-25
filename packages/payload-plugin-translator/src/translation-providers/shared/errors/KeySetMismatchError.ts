import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The reply's keys did not overlap the input's at all, so nothing could be applied.
 *
 * A *partial* mismatch is not an error: the matching subset is applied and the gap is reported.
 * Only a reply that matches nothing lands here, because that is indistinguishable from the model
 * having ignored the request.
 *
 * @since 0.11.0
 */
export class KeySetMismatchError extends TranslationProviderError {
  readonly code = "key-set-mismatch" as const;

  /** Input keys the reply did not answer. */
  readonly missing: number[];

  /** Keys the reply invented. */
  readonly unexpected: string[];

  constructor(message: string, missing: number[], unexpected: string[], options?: ErrorOptions) {
    super(message, options);
    this.missing = missing;
    this.unexpected = unexpected;
  }
}
