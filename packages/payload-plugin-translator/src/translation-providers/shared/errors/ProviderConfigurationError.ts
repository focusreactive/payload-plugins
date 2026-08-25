import { TranslationProviderError } from "./TranslationProviderError";

/**
 * The provider is configured in a way that cannot work — most often an optional SDK that is not
 * installed.
 *
 * @since 0.11.0
 */
export class ProviderConfigurationError extends TranslationProviderError {
  readonly code = "config" as const;
}
