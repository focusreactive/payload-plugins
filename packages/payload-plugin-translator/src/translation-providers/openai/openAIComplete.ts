import type { CompletionFn } from "../shared";
import { errorMessageLower, NoContentError, ProviderConfigurationError } from "../shared";
import type { OpenAIChatParams, OpenAIClientShape } from "./OpenAI.shapes";

export type OpenAISamplingParams = Pick<
  OpenAIChatParams,
  "temperature" | "top_p" | "frequency_penalty" | "presence_penalty"
>;

/**
 * Which structured-output envelope to send. See `OpenAIProviderConfig.structuredOutput` for when to
 * switch.
 *
 * @since 0.11.0
 */
export type OpenAIStructuredOutput = "json_schema" | "json_object";

/** Echoed back by the vendor in a rejection — see the sample message on `classifySchemaRejection`. */
const SCHEMA_NAME = "translation";

type SchemaRejection = "model-does-not-support" | "schema-rejected";

/**
 * Did the service reject the request over the schema envelope, and if so, why? The match stays
 * narrow: a proxy that echoes the request body into an error string would otherwise turn every rate
 * limit into a configuration problem.
 */
function classifySchemaRejection(cause: unknown): SchemaRejection | null {
  const text = errorMessageLower(cause);
  if (text === null) return null;

  if (!text.includes("response_format") && !text.includes("json_schema")) return null;

  // "…'response_format' of type 'json_schema' is not supported with this model."
  if (text.includes("not supported") || text.includes("unsupported")) {
    return "model-does-not-support";
  }

  // "Invalid schema for response_format 'translation': object has too many properties."
  if (text.includes("invalid schema")) return "schema-rejected";

  return null;
}

/**
 * The vendor boundary: the only place OpenAI's response shape is read.
 *
 * Takes a client you constructed — it never loads the `openai` package — so pair it with
 * `createTranslationProvider` to build a provider on an SDK version of your own choosing:
 * `createTranslationProvider({ complete: openAIComplete({ client, model }) })`.
 *
 * @since 0.11.0
 */
export function openAIComplete(args: {
  client: OpenAIClientShape;
  model: string;
  sampling?: OpenAISamplingParams;
  structuredOutput?: OpenAIStructuredOutput;
}): CompletionFn {
  const { client, model, sampling, structuredOutput = "json_schema" } = args;

  return async ({ systemPrompt, userContent, responseSchema, signal }) => {
    if (structuredOutput === "json_object" && !/json/iu.test(systemPrompt)) {
      throw new ProviderConfigurationError(
        'With structuredOutput: "json_object", OpenAI requires the word "json" somewhere in the prompt. Your systemPrompt override does not contain it.'
      );
    }

    const params: OpenAIChatParams = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format:
        structuredOutput === "json_schema"
          ? {
              type: "json_schema",
              json_schema: { name: SCHEMA_NAME, strict: true, schema: responseSchema },
            }
          : { type: "json_object" },
      ...sampling,
    };

    let result: Awaited<ReturnType<OpenAIClientShape["chat"]["completions"]["create"]>>;
    try {
      result = await client.chat.completions.create(params, signal ? { signal } : undefined);
    } catch (cause) {
      const rejection = structuredOutput === "json_schema" ? classifySchemaRejection(cause) : null;

      if (rejection === "model-does-not-support") {
        throw new ProviderConfigurationError(
          `The model "${model}" does not support the json_schema response format. Pass structuredOutput: "json_object" to createOpenAIProvider, or choose a model that supports structured outputs.`,
          { cause }
        );
      }

      if (rejection === "schema-rejected") {
        throw new ProviderConfigurationError(
          `OpenAI rejected the generated response schema. This usually means the document has more translatable fields than a strict schema allows. Pass structuredOutput: "json_object" to createOpenAIProvider, or translate a smaller subtree.`,
          { cause }
        );
      }

      throw cause;
    }

    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new NoContentError(
        "OpenAI returned no content. The reply may have been filtered, or the model produced nothing."
      );
    }

    return content;
  };
}
