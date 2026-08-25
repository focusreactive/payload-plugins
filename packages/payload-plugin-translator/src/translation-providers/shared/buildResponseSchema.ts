import type { TranslationInput } from "../../core/domain/translation-providers";

/**
 * A JSON Schema document, as a plain object.
 *
 * Deliberately not a rich schema type: this crosses the `complete` boundary to a consumer who will
 * hand it to some vendor's API, and every vendor spells the surrounding envelope differently. A
 * plain object is the only shape they all accept.
 *
 * @since 0.11.0
 */
export type JsonSchemaObject = Record<string, unknown>;

/**
 * Builds the response schema for a translation request: an object whose properties are exactly the
 * input's keys, all required, with no extras allowed.
 *
 * This is the structural half of key preservation. Where the prompt *asks* a model to keep the keys,
 * a schema sent as a strict response format leaves a compliant model unable to drop one — which is
 * what turns "the model usually keeps them" into "the model cannot silently lose a field".
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
