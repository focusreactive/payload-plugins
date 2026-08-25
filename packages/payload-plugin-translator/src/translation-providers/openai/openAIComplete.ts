import type { CompletionFn } from "../shared";
import { NoContentError, ProviderConfigurationError } from "../shared";
// Not via the public barrel: this helper has one caller and stays internal.
import { wrapTransportError } from "../shared/errors";
import type { OpenAIChatParams, OpenAIClientShape } from "./OpenAI.shapes";

/** Sampling knobs, sent only when a consumer configured them. */
export type OpenAISamplingParams = Pick<
  OpenAIChatParams,
  "temperature" | "top_p" | "frequency_penalty" | "presence_penalty"
>;

/**
 * Which structured-output envelope to send.
 *
 * `json_schema` is the strong one — a compliant model structurally cannot drop a requested key — and
 * it is the default. But it is also OpenAI-specific: several of the gateways this adapter exists to
 * admit (OpenRouter with some upstream models, older Azure deployments, self-hosted proxies) reject
 * it with a 400. `json_object` is the older, near-universal envelope; it only asks for valid JSON, so
 * key preservation then rests on the key-set validation rather than on the API.
 *
 * @since 0.11.0
 */
export type OpenAIStructuredOutput = "json_schema" | "json_object";

/** How a schema-related rejection was caused — they need different advice. */
type SchemaRejection = "model-does-not-support" | "schema-rejected";

/**
 * Did the service reject the request because of the schema envelope, and if so, why?
 *
 * Reading the vendor's text is not the same as repeating it: what it says decides which advice the
 * consumer gets, while the text itself stays on `cause` and never enters a message that could be
 * serialized into a response body.
 *
 * The two cases must be told apart, because "your model is too old" and "your schema is too big" have
 * nothing to do with each other. And the match has to be narrow: a proxy that echoes the request body
 * into an error string would otherwise turn every rate limit into a configuration problem.
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

  // Mentions the envelope for some other reason — an echoed request body in a rate-limit message,
  // say. Not ours to reinterpret.
  return null;
}

/**
 * The vendor boundary.
 *
 * This is where OpenAI's vocabulary stops. The response shape (`choices[0].message.content`) is read
 * here and nowhere else; whatever the SDK throws is converted here into this package's own failure
 * taxonomy, so no vendor exception class ever travels further in.
 *
 * A structural type could not do this job: a type erases at compile time and translates nothing at
 * runtime. Keeping the vendor out needs code, and this function is it.
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
    // OpenAI rejects `json_object` unless the word "json" appears in the messages. The built-in prompt
    // contains it, so the default path is safe — but a `systemPrompt` override that *replaces* the
    // default rather than extending it can drop it, and the resulting 400 reads as unrelated to the
    // prompt. Catching it here names the actual cause.
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
      // Before v0.11.0 this package sent `json_object`, which every model accepts. The stronger
      // `json_schema` envelope is now the default and several still-supported models reject it —
      // gpt-4-turbo, gpt-4, gpt-3.5-turbo, o1-*, and older gpt-4o snapshots among them. The vendor
      // explains exactly that, but its text never reaches the surfaced message (it can carry an API
      // key), so without this the consumer would see only a generic transport failure and have no way
      // to reach the option that fixes it.
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

    // Guard `choices[0]`: an empty array (a content-filtered response, say) would otherwise throw a
    // TypeError, which tells a reader nothing about what actually happened.
    const content = result.choices[0]?.message?.content;
    if (!content) {
      throw new NoContentError(
        "OpenAI returned no content. The reply may have been filtered, or the model produced nothing."
      );
    }

    return content;
  };
}
