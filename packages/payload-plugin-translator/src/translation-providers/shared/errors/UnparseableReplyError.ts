import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The reply was not JSON, or parsed to something that is not an object — arrays included.
 *
 * @since 0.11.0
 */
export class UnparseableReplyError extends TranslationProviderError {
  readonly code = "unparseable-reply" as const;
}
