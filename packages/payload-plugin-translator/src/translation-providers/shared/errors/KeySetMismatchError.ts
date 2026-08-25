import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The reply's keys did not overlap the input's at all, so nothing could be applied. A partial
 * mismatch is not an error — see {@link parseAndValidateReply}.
 *
 * @since 0.11.0
 */
export class KeySetMismatchError extends TranslationProviderError {
  readonly code = "key-set-mismatch" as const;

  readonly missingInputKeys: number[];

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
  }
}
