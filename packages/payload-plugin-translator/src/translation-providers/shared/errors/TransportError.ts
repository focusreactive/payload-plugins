import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The call to the provider failed — network, auth, rate limit, timeout. The vendor's own error is on
 * `cause`; its class never travels further than the adapter that caught it.
 *
 * @since 0.11.0
 */
export class TransportError extends TranslationProviderError {
  readonly code = "transport" as const;
}
