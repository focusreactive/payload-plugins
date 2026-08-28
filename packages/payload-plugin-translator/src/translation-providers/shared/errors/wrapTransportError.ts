import { TransportError } from "./TransportError";
import { TranslationProviderError } from "./TranslationProviderError";

/**
 * Turns anything a transport threw into a {@link TransportError}, keeping the original on `cause`.
 * A value that is already one of ours passes through: re-wrapping would bury a specific cause under
 * a generic transport failure.
 */
export function wrapTransportError(cause: unknown): TranslationProviderError {
  if (cause instanceof TranslationProviderError) return cause;

  return new TransportError(
    "The translation request failed before a reply could be read. The provider's own error is on this error's `cause` property.",
    { cause }
  );
}
