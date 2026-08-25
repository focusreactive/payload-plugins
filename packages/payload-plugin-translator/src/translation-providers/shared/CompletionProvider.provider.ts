import type {
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
} from "../../core/domain/translation-providers";
import { buildResponseSchema } from "./buildResponseSchema";
import type { JsonSchemaObject } from "./buildResponseSchema";
import { buildSystemPrompt } from "./buildSystemPrompt";
import type { SystemPromptBuilder } from "./buildSystemPrompt";
import { NoContentError, ProviderConfigurationError, wrapTransportError } from "./errors";
import { parseAndValidateReply } from "./parseAndValidateReply";
import { runDryRun } from "./runDryRun";
import type { DryRunConfig } from "./runDryRun";

/**
 * Everything a transport needs in order to make one translation request.
 *
 * @since 0.11.0
 */
export type CompletionRequest = {
  /** The system prompt to send. Already built — including any `systemPrompt` override. */
  systemPrompt: string;
  /** The user message: the input serialized as JSON. */
  userContent: string;
  /**
   * A JSON Schema requiring exactly the input's keys. Hand it to whatever structured-output
   * mechanism the service offers — this is what stops a compliant model dropping a field.
   */
  responseSchema: JsonSchemaObject;
  /** Cancellation, when the caller supplied one. Honour it if the transport can. */
  signal?: AbortSignal;
};

/**
 * Sends one translation request and returns the service's reply as **raw text**.
 *
 * Returning text rather than a parsed object is deliberate: parsing and key-set validation stay on
 * this side of the boundary, so a provider built on this factory cannot accidentally skip them.
 *
 * @since 0.11.0
 */
export type CompletionFn = (request: CompletionRequest) => Promise<string>;

/**
 * Configuration for {@link createTranslationProvider}.
 *
 * @since 0.11.0
 */
export type TranslationProviderConfig = {
  /** The one thing you supply: how to reach your service. */
  complete: CompletionFn;
  /** Replace or extend the built-in system prompt. */
  systemPrompt?: SystemPromptBuilder;
  /**
   * Simulate translations without calling anything. `true` reverses the text; an object supplies a
   * transformer and an optional delay.
   */
  dryRun?: boolean | DryRunConfig;
};

/**
 * A partial reply is applied rather than rejected, so the gap has to be reported somewhere. This
 * reaches the server log only, not the editor's screen.
 */
function warnAboutPartialReply(missingInputKeys: number[], unrequestedReplyKeys: string[]): void {
  const parts = [
    missingInputKeys.length > 0
      ? "[payload-plugin-translator] The provider's reply did not cover every field."
      : "[payload-plugin-translator] The provider's reply carried keys that were not requested.",
  ];

  if (missingInputKeys.length > 0) {
    parts.push(`Untranslated indices: ${missingInputKeys.join(", ")}.`);
  }
  if (unrequestedReplyKeys.length > 0) {
    parts.push(`Unexpected keys ignored: ${unrequestedReplyKeys.join(", ")}.`);
  }

  console.warn(parts.join(" "));
}

/**
 * Builds a complete {@link TranslationProvider} from a single request function.
 *
 * Use it when you need a service this package does not ship an adapter for, or when you need full
 * control of the request body. If you only need a different endpoint or client options for OpenAI,
 * `createOpenAIProvider` already accepts a ready-made client.
 *
 * @example
 * ```ts
 * const provider = createTranslationProvider({
 *   complete: async ({ systemPrompt, userContent, responseSchema, signal }) => {
 *     const reply = await myService.chat({ systemPrompt, userContent, schema: responseSchema, signal })
 *     return reply.text
 *   },
 * })
 * ```
 *
 * @since 0.11.0
 */
export function createTranslationProvider(config: TranslationProviderConfig): TranslationProvider {
  const { complete, systemPrompt, dryRun } = config;

  return {
    async translate(
      input: TranslationInput,
      sourceLng: string,
      targetLng: string
    ): Promise<TranslationOutput | null> {
      // A dry run must precede everything a transport might lazily set up: consumers build providers
      // with an empty API key for it.
      if (dryRun) {
        try {
          return await runDryRun(input, dryRun);
        } catch (cause) {
          throw new ProviderConfigurationError(
            "The dry-run transformer threw. See this error's `cause`.",
            { cause }
          );
        }
      }

      if (Object.keys(input).length === 0) return {};

      let request: CompletionRequest;
      try {
        request = {
          systemPrompt: buildSystemPrompt({ sourceLng, targetLng, override: systemPrompt }),
          userContent: JSON.stringify(input),
          responseSchema: buildResponseSchema(input),
        };
      } catch (cause) {
        throw new ProviderConfigurationError(
          "The systemPrompt builder threw. See this error's `cause`.",
          { cause }
        );
      }

      let raw: string;
      try {
        raw = await complete(request);
      } catch (cause) {
        throw wrapTransportError(cause);
      }

      if (!raw) {
        throw new NoContentError("The provider returned an empty reply.");
      }

      const { translations, missingInputKeys, unrequestedReplyKeys } = parseAndValidateReply(
        input,
        raw
      );

      if (missingInputKeys.length > 0 || unrequestedReplyKeys.length > 0) {
        warnAboutPartialReply(missingInputKeys, unrequestedReplyKeys);
      }

      return translations;
    },
  };
}
