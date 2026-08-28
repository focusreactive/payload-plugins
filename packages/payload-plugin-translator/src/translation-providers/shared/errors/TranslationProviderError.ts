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
export abstract class TranslationProviderError extends Error {
  abstract readonly code: TranslationFailureCode;

  constructor(message: string, options?: ErrorOptions) {
    // Never `this.cause = cause`: an assigned property is enumerable, so JSON.stringify and pino
    // serialize the vendor error whole — headers and API key with it. `super` installs it non-enumerably.
    super(message, options);
    this.name = new.target.name;
  }
}
