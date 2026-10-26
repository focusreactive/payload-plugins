import type { Field } from "payload";
import { ZodArray, ZodBoolean, ZodDefault, ZodNullable, ZodOptional } from "zod";
import type { ZodObject, ZodRawShape, ZodTypeAny } from "zod";

const unwrapped = (schema: ZodTypeAny): ZodTypeAny => {
  let current = schema;
  for (;;) {
    if (current instanceof ZodOptional || current instanceof ZodNullable) {
      current = current.unwrap() as ZodTypeAny;
      continue;
    }
    if (current instanceof ZodDefault) {
      current = current.removeDefault() as ZodTypeAny;
      continue;
    }
    return current;
  }
};

const typeOf = (inner: ZodTypeAny): "checkbox" | "json" | "text" => {
  if (inner instanceof ZodBoolean) return "checkbox";
  if (inner instanceof ZodArray) return "json";
  return "text";
};

const fieldFor = (name: string, schema: ZodTypeAny): Field => {
  const inner = unwrapped(schema);
  const field: Record<string, unknown> = { type: typeOf(inner), name };

  const maxLength = (inner as { maxLength?: number | null }).maxLength;
  if (maxLength != null) field.maxLength = maxLength;

  const withoutValue = schema.safeParse(undefined);
  if (withoutValue.success && withoutValue.data !== undefined) {
    field.defaultValue = withoutValue.data;
  } else if (!schema.isOptional() && !schema.isNullable()) {
    field.required = true;
  }

  return field as Field;
};

/**
 * Turn a stored-input schema into the `Field[]` Payload registers for a task or a workflow.
 *
 * Reads only zod's public surface: `_def.typeName` is `undefined` on zod 4 and this repository
 * carries both majors, so a generator reading `_def` would break on a version bump.
 */
export const toPayloadFields = (schema: ZodObject<ZodRawShape>): Field[] =>
  Object.entries(schema.shape).map(([name, member]) => fieldFor(name, member as ZodTypeAny));

/**
 * Splice the deprecated relationship back in where it has always sat — directly after the flat pair
 * that replaced it.
 *
 * It is written by hand rather than generated because it is the one field with no counterpart in
 * the plugin's own types: nothing writes it, one reader falls back to it, and it leaves with the
 * next major. See docs/DEPRECATIONS.md#jobs-input-collection-field
 */
export const withLegacyCollection = (fields: Field[], relationTo: string[]): Field[] => {
  const legacy = {
    type: "relationship",
    name: "collection",
    relationTo,
    required: false,
    admin: {
      readOnly: true,
      description: "Deprecated. See docs/DEPRECATIONS.md#jobs-input-collection-field",
    },
  } as unknown as Field;

  const after = fields.findIndex((field) => "name" in field && field.name === "collection_id");
  return [...fields.slice(0, after + 1), legacy, ...fields.slice(after + 1)];
};
