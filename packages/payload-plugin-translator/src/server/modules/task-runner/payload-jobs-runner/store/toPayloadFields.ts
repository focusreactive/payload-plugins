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
