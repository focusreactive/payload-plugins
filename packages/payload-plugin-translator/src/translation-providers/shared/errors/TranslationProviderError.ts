import { TranslatorError } from "../../../core/errors/index.js";

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
 * Base class for every failure a built-in translation provider reports.
 *
 * The original failure travels on `cause` and is never interpolated into `message`: a vendor SDK
 * error can carry an API key, and `message` reaches an HTTP response body.
 *
 * @since 0.11.0
 */
export abstract class TranslationProviderError extends TranslatorError {
  abstract readonly code: TranslationFailureCode;

  readonly mustPropagate = false;
}
