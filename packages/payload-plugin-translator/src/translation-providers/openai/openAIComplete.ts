import type { CompletionFn } from "../shared";
import { NoContentError, ProviderConfigurationError } from "../shared";
import { wrapTransportError } from "../shared/errors";
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

type SchemaRejection = "model-does-not-support" | "schema-rejected";

/**
 * Did the service reject the request over the schema envelope, and if so, why? The match stays
 * narrow: a proxy that echoes the request body into an error string would otherwise turn every rate
 * limit into a configuration problem.
 */
function classifySchemaRejection(cause: unknown): SchemaRejection | null {
  if (typeof cause !== "object" || cause === null) return null;

  const message = (cause as { message?: unknown }).message;
  if (typeof message !== "string") return null;

  const text = message.toLowerCase();
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
 * The vendor boundary: the only place OpenAI's response shape is read and the only place its errors
 * are converted into this package's failure taxonomy.
 *
 * A rejection of the schema envelope itself becomes a {@link ProviderConfigurationError} naming
 * `structuredOutput`; every other failure — including one whose text merely mentions the envelope —
 * stays a transport failure.
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
              json_schema: { name: "translation", strict: true, schema: responseSchema },
            }
          : { type: "json_object" },
      ...sampling,
    };

    let result: Awaited<ReturnType<OpenAIClientShape["chat"]["completions"]["create"]>>;
    try {
      result = await client.chat.completions.create(params, signal ? { signal } : undefined);
    } catch (cause) {
      if (structuredOutput === "json_schema") {
        const rejection = classifySchemaRejection(cause);

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
      }

      throw wrapTransportError(cause);
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
