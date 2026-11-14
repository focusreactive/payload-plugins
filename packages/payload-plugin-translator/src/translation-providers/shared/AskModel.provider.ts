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
import { fromSections, inlineMarksInstruction, toSections } from "./wire/index.js";
import type { SectionsJson } from "./wire/index.js";

/**
 * One question for a language model. Every field is already built: send it as it is, never rebuild
 * the prompt or the schema.
 *
 * @since 1.0.0
 */
export type ModelRequest = {
  systemPrompt: string;
  userContent: SectionsJson;
  responseSchema: JsonSchemaObject;
};

/**
 * Asks a language model one question and returns its reply as **raw text**.
 *
 * Returning text rather than a parsed object is deliberate: parsing and key-set validation stay on
 * this side of the boundary, so a provider built on this factory cannot accidentally skip them.
 *
 * @since 1.0.0
 */
export type AskModel = (request: ModelRequest) => Promise<string>;

/**
 * Configuration for {@link createTranslationProvider}.
 *
 * @since 0.11.0
 */
export type TranslationProviderConfig = {
  askModel: AskModel;
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
 * Builds a whole {@link TranslationProvider} from one function that asks a language model.
 *
 * Use it when you need a service this package does not ship an adapter for, or when you need full
 * control of the request body.
 *
 * @example
 * ```ts
 * const provider = createTranslationProvider({
 *   askModel: async ({ systemPrompt, userContent, responseSchema }) => {
 *     const reply = await myService.chat({ systemPrompt, userContent, schema: responseSchema })
 *     return reply.text
 *   },
 * })
 * ```
 *
 * @since 0.11.0
 */
export function createTranslationProvider(config: TranslationProviderConfig): TranslationProvider {
  const { askModel, systemPrompt } = config;

  return {
    async translate(
      input: TranslationInput,
      request: TranslationRequest
    ): Promise<TranslationOutput> {
      if (Object.keys(input).length === 0) return {};

      const sections = toSections(input);
      const marked = Object.keys(sections.marked).length > 0;
      const systemPromptText = await asConfigurationFailure("systemPrompt builder", () =>
        buildSystemPrompt({
          sourceLng: request.sourceLng,
          targetLng: request.targetLng,
          override: systemPrompt,
          alwaysAppend: marked ? [inlineMarksInstruction()] : [],
          document: request.document,
        })
      );

      const question = await asConfigurationFailure("serialization of the input", () => ({
        systemPrompt: systemPromptText,
        userContent: JSON.stringify(sections),
        responseSchema: buildResponseSchema(sections),
      }));

      let raw: string;
      try {
        raw = await askModel(question);
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
