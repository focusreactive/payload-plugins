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
  /** Already includes any `systemPrompt` override — send it verbatim, do not rebuild it. */
  systemPrompt: string;
  /** The user message: the input serialized as JSON. */
  userContent: string;
  /** A JSON Schema requiring exactly the input's keys. Feed it to the service's structured-output mechanism. */
  responseSchema: JsonSchemaObject;
  /** Reserved: the port carries no cancellation yet, so this is always `undefined` today. */
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
  complete: CompletionFn;
  systemPrompt?: SystemPromptBuilder;
  /**
   * Simulate translations without calling anything. `true` reverses the text; an object supplies a
   * transformer and an optional delay.
   *
   * @deprecated Supply your own fake `complete` instead. Remove in next major.
   * See docs/DEPRECATIONS.md#provider-dry-run
   */
  dryRun?: boolean | DryRunConfig;
};

/** How many model-invented keys a single warning may name. */
const MAX_LOGGED_REPLY_KEYS = 10;

/**
 * Renders reply keys for a log line. They are model output, so each is quoted — an unquoted key
 * containing a newline would forge log entries — and the list is capped.
 */
function describeReplyKeys(keys: string[]): string {
  const shown = keys.slice(0, MAX_LOGGED_REPLY_KEYS).map((key) => JSON.stringify(key));
  const rest = keys.length - shown.length;

  return rest > 0 ? `${shown.join(", ")} and ${rest} more` : shown.join(", ");
}

function warnAboutPartialReply(missingInputKeys: number[], unrequestedReplyKeys: string[]): void {
  const parts: string[] = [];

  if (missingInputKeys.length > 0) {
    parts.push(
      "[payload-plugin-translator] The provider's reply did not cover every field.",
      `Untranslated indices: ${missingInputKeys.join(", ")}.`
    );
  } else {
    parts.push(
      "[payload-plugin-translator] The provider's reply carried keys that were not requested."
    );
  }

  if (unrequestedReplyKeys.length > 0) {
    parts.push(`Unexpected keys ignored: ${describeReplyKeys(unrequestedReplyKeys)}.`);
  }

  console.warn(parts.join(" "));
}

async function asConfigurationFailure<T>(what: string, run: () => T | Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (cause) {
    throw new ProviderConfigurationError(`The ${what} threw. See this error's \`cause\`.`, {
      cause,
    });
  }
}

/** Wraps the consumer's transformer so its throw is classified, leaving our own loop unguarded. */
function guardTransformer(dryRun: boolean | DryRunConfig): boolean | DryRunConfig {
  if (typeof dryRun !== "object" || !dryRun.transform) return dryRun;

  const { transform } = dryRun;
  return {
    ...dryRun,
    transform: (text) => asConfigurationFailure("dry-run transformer", () => transform(text)),
  };
}

function createDryRunProvider(dryRun: boolean | DryRunConfig): TranslationProvider {
  const guarded = guardTransformer(dryRun);

  return {
    translate: (input: TranslationInput): Promise<TranslationOutput> => runDryRun(input, guarded),
  };
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
 *   complete: async ({ systemPrompt, userContent, responseSchema }) => {
 *     const reply = await myService.chat({ systemPrompt, userContent, schema: responseSchema })
 *     return reply.text
 *   },
 * })
 * ```
 *
 * @since 0.11.0
 */
export function createTranslationProvider(config: TranslationProviderConfig): TranslationProvider {
  const { complete, systemPrompt, dryRun } = config;

  if (dryRun) return createDryRunProvider(dryRun);

  return {
    async translate(
      input: TranslationInput,
      sourceLng: string,
      targetLng: string
    ): Promise<TranslationOutput> {
      if (Object.keys(input).length === 0) return {};

      const systemPromptText = await asConfigurationFailure("systemPrompt builder", () =>
        buildSystemPrompt({ sourceLng, targetLng, override: systemPrompt })
      );

      // Ours, not the caller's — but an input that cannot be serialized still came from the caller,
      // and a raw throw here would be the one failure that escapes this taxonomy.
      const request = await asConfigurationFailure("translation request", () => ({
        systemPrompt: systemPromptText,
        userContent: JSON.stringify(input),
        responseSchema: buildResponseSchema(input),
      }));

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
