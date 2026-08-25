import { TransportError } from "./TransportError";
import { TranslationProviderError } from "./TranslationProviderError";

/**
 * Turns anything a transport threw into a {@link TransportError}, keeping the original on `cause`.
 *
 * The message deliberately does NOT quote the original. A vendor SDK error can carry request
 * metadata — including the API key — and this message reaches an HTTP response body, so quoting it
 * would leak the key to anyone who can see an error page. The original stays on `cause`, where a log
 * or a debugger can reach it and a response serializer will not.
 *
 * A value that is already one of ours passes through untouched: re-wrapping would bury a specific
 * cause (a key-set mismatch, say) under a generic transport failure.
 *
 * @since 0.11.0
 */
export function wrapTransportError(cause: unknown): TranslationProviderError {
  if (cause instanceof TranslationProviderError) return cause;

  return new TransportError(
    "The translation request failed before a reply could be read. The provider's own error is on this error's `cause` property.",
    { cause }
  );
}
