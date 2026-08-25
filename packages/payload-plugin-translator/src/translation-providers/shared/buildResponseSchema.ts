import type { TranslationInput } from "../../core/domain/translation-providers";

/**
 * A JSON Schema document, as a plain object — deliberately untyped beyond that, so it can be dropped
 * into any vendor's response-format envelope.
 *
 * @since 0.11.0
 */
export type JsonSchemaObject = Record<string, unknown>;

/**
 * Builds the response schema for a translation request: exactly the input's keys, all required, no
 * extras. Sent as a strict response format, this is what stops a compliant model dropping a field.
 *
 * @since 0.11.0
 */
export function buildResponseSchema(input: TranslationInput): JsonSchemaObject {
  const keys = Object.keys(input);

  const properties: Record<string, JsonSchemaObject> = {};
  for (const key of keys) {
    properties[key] = { type: "string" };
  }

  return {
    type: "object",
    properties,
    required: keys,
    additionalProperties: false,
  };
}
