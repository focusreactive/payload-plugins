import { TranslationProviderError } from "./TranslationProviderError";

/**
 * Nothing in the reply could be applied — either its keys did not overlap the input's, or they did
 * and none of the values was a string. A partial gap is not an error; see `parseAndValidateReply`.
 *
 * @since 0.11.0
 */
export class KeySetMismatchError extends TranslationProviderError {
  readonly code = "key-set-mismatch" as const;

  /** Input keys left without a usable translation. */
  readonly missingInputKeys: number[];

  /** Keys the reply carried but nobody asked for — model output, so untrusted text. */
  readonly unrequestedReplyKeys: string[];

  constructor(
    message: string,
    missingInputKeys: number[],
    unrequestedReplyKeys: string[],
    options?: ErrorOptions
  ) {
    super(message, options);
    this.missingInputKeys = missingInputKeys;
    this.unrequestedReplyKeys = unrequestedReplyKeys;

    // Model-invented strings: enumerable, they would land in `JSON.stringify(error)` and every
    // structured logger.
    Object.defineProperty(this, "missingInputKeys", { enumerable: false });
    Object.defineProperty(this, "unrequestedReplyKeys", { enumerable: false });
  }
}
