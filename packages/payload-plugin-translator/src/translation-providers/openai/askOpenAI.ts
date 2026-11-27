import { markFailureReason } from "../../core/errors/failureReason.js";
import { isObject } from "../../core/kernel/utils/isObject.js";
import type { AskModel, JsonSchemaObject } from "../shared/index.js";
import { errorMessageLower, NoContentError, ProviderConfigurationError } from "../shared/index.js";
import type {
  OpenAIChatParams,
  OpenAIChatResult,
  OpenAIClientShape,
  OpenAIResponseFormat,
} from "./OpenAI.shapes.js";

/**
 * OpenAI's request body, minus what {@link askOpenAI} fills in.
 *
 * Nothing is defaulted here: several models reject sampling parameters outright, so an unset field
 * is left out of the request.
 *
 * @since 1.0.0
 */
export type OpenAIParams = Omit<OpenAIChatParams, "messages" | "response_format">;

/**
 * Which structured-output envelope to send.
 *
 * `json_schema` (the default): the reply must satisfy a schema, so a compliant model cannot drop a
 * field. Older models and some gateways reject it with a 400, and the schema has a per-model
 * property ceiling a large document can exceed.
 *
 * `json_object`: asks only for valid JSON. No ceiling, but a dropped key is then detected by
 * key-set validation after the fact rather than prevented.
 *
 * The README weighs the two and explains how to size a document against the ceiling.
 *
 * @since 0.11.0
 */
export type OpenAIStructuredOutput = "json_schema" | "json_object";

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

  // Observed 2026-09: "…'response_format' of type 'json_schema' is not supported with this model."
  if (text.includes("not supported") || text.includes("unsupported")) {
    return "model-does-not-support";
  }

  // Observed 2026-09: "Invalid schema for response_format 'translation': object has too many properties."
  if (text.includes("invalid schema")) return "schema-rejected";

  return null;
}

const MODEL_ACCESS_CODE = "model_not_found";

/**
 * Only for a gateway that forwards the text and no `code` — Azure, OpenRouter, a corporate proxy.
 * A full phrase rather than the word `model`, which such a gateway also echoes in rate limits.
 * Wording as observed 2026-09; the code above is what carries this when OpenAI rewords it.
 */
const MODEL_ACCESS_PHRASE = "does not exist or you do not have access";

function isModelAccessFailure(cause: unknown): boolean {
  if (isObject(cause) && cause.code === MODEL_ACCESS_CODE) return true;

  const text = errorMessageLower(cause);
  return text !== null && text.includes(MODEL_ACCESS_PHRASE);
}

type ActionableFailure = "model-unavailable" | SchemaRejection;

const ADVICE: Record<ActionableFailure, (model: string) => string> = {
  "model-unavailable": (model) =>
    markFailureReason(
      "model-unavailable",
      `The model "${model}" is not available to this API key. Pass a \`model\` your key can use in \`params\`.`
    ),
  "model-does-not-support": (model) =>
    `The model "${model}" does not support the json_schema response format. Pass structuredOutput: "json_object", or choose a model that supports structured outputs.`,
  "schema-rejected": () =>
    'OpenAI rejected the generated response schema. This usually means the document has more translatable fields than a strict schema allows. Pass structuredOutput: "json_object", or translate a smaller subtree.',
};

function responseFormatFor(
  structuredOutput: OpenAIStructuredOutput,
  responseSchema: JsonSchemaObject
): OpenAIResponseFormat {
  if (structuredOutput === "json_object") return { type: "json_object" };

  return {
    type: "json_schema",
    json_schema: { name: SCHEMA_NAME, strict: true, schema: responseSchema },
  };
}

/**
 * Model access is asked first: a model nobody can reach is the specific reason behind a rejection.
 */
function classifyFailure(
  cause: unknown,
  structuredOutput: OpenAIStructuredOutput
): ActionableFailure | null {
  if (isModelAccessFailure(cause)) return "model-unavailable";
  if (structuredOutput !== "json_schema") return null;
  return classifySchemaRejection(cause);
}

/**
 * Asks OpenAI and returns the reply as raw text. The vendor boundary: nothing outside this file
 * reads OpenAI's response shape.
 *
 * Takes a client you constructed — it never loads the `openai` package — so pair it with
 * `createTranslationProvider` to build a provider on an SDK version of your own choosing:
 * `createTranslationProvider({ askModel: askOpenAI({ client, params: { model } }) })`.
 *
 * @since 1.0.0
 */
export function askOpenAI(args: {
  client: OpenAIClientShape;
  params: OpenAIParams;
  structuredOutput?: OpenAIStructuredOutput;
}): AskModel {
  const { client, params: requested, structuredOutput = "json_schema" } = args;
  const { model } = requested;

  return async ({ systemPrompt, userContent, responseSchema }) => {
    if (structuredOutput === "json_object" && !/json/iu.test(systemPrompt)) {
      throw new ProviderConfigurationError(
        'With structuredOutput: "json_object", OpenAI requires the word "json" somewhere in the prompt. Your systemPrompt override does not contain it.'
      );
    }

    const body: OpenAIChatParams = {
      ...requested,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: responseFormatFor(structuredOutput, responseSchema),
    };

    let result: OpenAIChatResult;
    try {
      result = await client.chat.completions.create(body);
    } catch (cause) {
      const failure = classifyFailure(cause, structuredOutput);
      if (failure === null) throw cause;

      throw new ProviderConfigurationError(ADVICE[failure](model), { cause });
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
