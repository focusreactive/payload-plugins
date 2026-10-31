import type {
  TranslationInput,
  TranslationOutput,
  TranslationProvider,
  TranslationRequest,
} from "../../core/domain/translation-providers/index.js";
import { buildResponseSchema } from "./buildResponseSchema.js";
import type { JsonSchemaObject } from "./buildResponseSchema.js";
import { buildSystemPrompt } from "./buildSystemPrompt.js";
import type { SystemPromptBuilder } from "./buildSystemPrompt.js";
import {
  KeySetMismatchError,
  NoContentError,
  ProviderConfigurationError,
  asTranslatorError,
} from "./errors/index.js";
import { parseAndValidateReply } from "./parseAndValidateReply.js";
import { fromSections, toSections } from "./wire/index.js";

/**
 * Everything a transport needs in order to make one translation request.
 *
 * @since 0.11.0
 */
export type CompletionRequest = {
  /** Already includes any `systemPrompt` override — send it verbatim, do not rebuild it. */
  systemPrompt: string;
  /**
   * The user message: JSON `{ marked, plain }` of strings. A paragraph that cannot be marked is sent
   * as its pieces under `plain`, keyed `<index>.<segmentId>`.
   */
  userContent: string;
  /** A strict JSON Schema: both sections, exactly the keys that were sent. */
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
};

/** Pieces can come back while no whole value assembles — a gap the reply's own key check cannot see. */
function assertSomethingAssembled(input: TranslationInput, output: TranslationOutput): void {
  if (Object.keys(output).length > 0) return;
  throw new KeySetMismatchError(
    `The provider's reply let none of the ${Object.keys(input).length} values be assembled.`,
    Object.keys(input).map(Number),
    []
  );
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

/**
 * Builds a complete {@link TranslationProvider} from a single request function.
 *
 * Use it when you need a service this package does not ship an adapter for, or when you need full
 * control of the request body. For OpenAI, `openAIComplete({ client, model })` is a ready-made
 * `complete` — construct the client yourself.
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
  const { complete, systemPrompt } = config;

  return {
    async translate(
      input: TranslationInput,
      request: TranslationRequest
    ): Promise<TranslationOutput> {
      if (Object.keys(input).length === 0) return {};

      const sections = toSections(input);
      const systemPromptText = await asConfigurationFailure("systemPrompt builder", () =>
        buildSystemPrompt({
          sourceLng: request.sourceLng,
          targetLng: request.targetLng,
          override: systemPrompt,
          hasInlineMarks: Object.keys(sections.marked).length > 0,
          document: request.document,
        })
      );

      const completion = await asConfigurationFailure("serialization of the input", () => ({
        systemPrompt: systemPromptText,
        userContent: JSON.stringify(sections),
        responseSchema: buildResponseSchema(sections),
      }));

      let raw: string;
      try {
        raw = await complete(completion);
      } catch (cause) {
        throw asTranslatorError(cause);
      }

      if (!raw) {
        throw new NoContentError("The provider returned an empty reply.");
      }

      const reply = parseAndValidateReply(sections, raw);
      const output = fromSections(input, reply);
      assertSomethingAssembled(input, output);
      return output;
    },
  };
}
