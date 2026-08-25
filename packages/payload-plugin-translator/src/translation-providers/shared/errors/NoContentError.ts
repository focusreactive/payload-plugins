import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The provider produced no usable text — an empty reply, or a response the vendor filtered.
 *
 * @since 0.11.0
 */
export class NoContentError extends TranslationProviderError {
  readonly code = "no-content" as const;
}
