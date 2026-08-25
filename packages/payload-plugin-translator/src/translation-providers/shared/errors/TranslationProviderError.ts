/**
 * Failure causes a translation provider can report. Kept a closed literal union so a caller can
 * branch exhaustively.
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
 * The original failure always travels on the standard `cause` property and is **never** interpolated
 * into `message` — a vendor SDK error can carry request metadata (including an API key), and this
 * message reaches an HTTP response body, so folding it in would publish the key on an error page.
 *
 * Each cause is its own subclass in its own file, so a listing of `errors/` reads as the list of ways
 * a translation can fail.
 *
 * @since 0.11.0
 */
export abstract class TranslationProviderError extends Error {
  abstract readonly code: TranslationFailureCode;

  constructor(message: string, options?: ErrorOptions) {
    // `super(message, options)`, never `this.cause = …`. An assignment creates an *enumerable* own
    // property, so `JSON.stringify(error)` — and every structured logger, Payload's pino included —
    // serializes the vendor error whole, headers and API key with it. The standard `cause` installed
    // by `Error` is non-enumerable and stays out of that output. This is the flanking route around
    // the guarantee the rest of this taxonomy is built on: messages never quote the cause, so this
    // was the one path left that could publish it.
    super(message, options);
    this.name = new.target.name;
  }
}
