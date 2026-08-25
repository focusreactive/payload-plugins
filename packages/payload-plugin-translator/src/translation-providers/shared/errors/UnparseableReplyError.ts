import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The reply was not JSON, or parsed to something that is not an object — an array included, since an
 * array's numeric indices can coincidentally line up with the requested keys and quietly look right.
 *
 * @since 0.11.0
 */
export class UnparseableReplyError extends TranslationProviderError {
  readonly code = "unparseable-reply" as const;
}
