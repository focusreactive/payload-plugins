import type {
  TranslationRequestOptions,
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../core/domain/translation-providers/index.js";
import { createOpenAIProvider } from "./OpenAITranslation.provider.js";
import type { OpenAIProviderConfig } from "./OpenAITranslation.provider.js";

/**
 * @deprecated Use {@link createOpenAIProvider} instead.
 * See docs/DEPRECATIONS.md#openai-translation-provider-class
 */
export class OpenAITranslationProvider implements TranslationProvider {
  private readonly inner: TranslationProvider;

  constructor(config: OpenAIProviderConfig) {
    this.inner = createOpenAIProvider(config);
  }

  get capabilities(): TranslationProvider["capabilities"] {
    return this.inner.capabilities;
  }

  translate(
    input: TranslationInput,
    sourceLng: string,
    targetLng: string,
    options?: TranslationRequestOptions
  ): Promise<TranslationOutput | null> {
    return this.inner.translate(input, sourceLng, targetLng, options);
  }
}
