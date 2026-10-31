import { SECTION_NAMES } from "./wire/index.js";
import type { Sections } from "./wire/index.js";

/**
 * A JSON Schema document, as a plain object — deliberately untyped beyond that, so it can be dropped
 * into any vendor's response-format envelope.
 *
 * @since 0.11.0
 */
export type JsonSchemaObject = Record<string, unknown>;

const strictObject = (properties: Record<string, JsonSchemaObject>): JsonSchemaObject => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export function buildResponseSchema(sections: Sections): JsonSchemaObject {
  const sectionSchemas: Record<string, JsonSchemaObject> = {};

  for (const name of SECTION_NAMES) {
    const valueSchemas: Record<string, JsonSchemaObject> = {};
    for (const key of Object.keys(sections[name])) {
      valueSchemas[key] = { type: "string" };
    }
    sectionSchemas[name] = strictObject(valueSchemas);
  }

  return strictObject(sectionSchemas);
}
