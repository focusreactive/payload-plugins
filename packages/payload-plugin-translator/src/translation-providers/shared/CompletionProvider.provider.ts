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
  /**
   * Cancellation, when the caller supplied one. Honour it if the transport can; the port itself
   * gains its own signal parameter in a later change.
   */
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
 * A partial reply is applied rather than rejected, so without this line the loss would be silent —
 * which is the defect this whole change exists to remove. It reaches a log, not the editor's screen;
 * surfacing it in the admin UI needs a channel the wire format does not have and is tracked
 * separately.
 */
function warnAboutPartialReply(missing: number[], unexpected: string[]): void {
  // The headline has to match the case too: a reply that merely carried an extra key DID cover every
  // field, and announcing otherwise would be the same false claim one level up.
  const parts = [
    missing.length > 0
      ? "[payload-plugin-translator] The provider's reply did not cover every field."
      : "[payload-plugin-translator] The provider's reply carried keys that were not requested.",
  ];

  if (missing.length > 0) parts.push(`Untranslated indices: ${missing.join(", ")}.`);
  if (unexpected.length > 0) parts.push(`Unexpected keys ignored: ${unexpected.join(", ")}.`);

  console.warn(parts.join(" "));
}

/**
 * Builds a complete {@link TranslationProvider} from a single request function.
 *
 * Everything that is true of a translation regardless of vendor lives here — the prompt, the
 * response schema, parsing, key-set validation, dry-run simulation, and normalizing whatever the
 * transport threw into this package's failure taxonomy. What is left for the caller is the call
 * itself: the endpoint, the credentials, the timeout, the retry policy.
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
      // Before anything else, including anything a transport might lazily set up: a dry run must
      // reach no service at all. Consumers rely on this to build a provider with an empty API key.
      // Wrapped because `dryRun.transform` is consumer code — an unwrapped throw here would be the
      // one failure that escapes this taxonomy.
      if (dryRun) {
        try {
          return await runDryRun(input, dryRun);
        } catch (cause) {
          // A throwing `dryRun.transform` is broken *configuration*, not a transport failure — no
          // service was contacted. Calling it transport would repeat the mistake the SDK
          // constructor's own handler was corrected for.
          throw new ProviderConfigurationError(
            "The dry-run transformer threw. See this error's `cause`.",
            { cause }
          );
        }
      }

      if (Object.keys(input).length === 0) return {};

      let request: CompletionRequest;
      try {
        // `systemPrompt` is a consumer callback too, so building the request is inside the guard.
        request = {
          systemPrompt: buildSystemPrompt({ sourceLng, targetLng, override: systemPrompt }),
          userContent: JSON.stringify(input),
          responseSchema: buildResponseSchema(input),
        };
      } catch (cause) {
        // Same reasoning: a throwing `systemPrompt` builder is configuration the caller supplied.
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

      const { translations, missing, unexpected } = parseAndValidateReply(input, raw);

      if (missing.length > 0 || unexpected.length > 0) {
        warnAboutPartialReply(missing, unexpected);
      }

      return translations;
    },
  };
}
