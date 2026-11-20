import type { ParamDef } from "../types.js";
import { WorkflowError } from "./errors.js";

const optionValue = (option: NonNullable<ParamDef["options"]>[number]): string =>
  typeof option === "string" ? option : option.value;

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === "";

const problemWith = (def: ParamDef, value: unknown): string | null => {
  switch (def.type) {
    case "string":
    case "text":
      return typeof value === "string" ? null : "must be a string";
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? null : "must be a number";
    case "boolean":
      return typeof value === "boolean" ? null : "must be a boolean";
    case "date":
      return typeof value === "string" && !Number.isNaN(Date.parse(value))
        ? null
        : "must be an ISO date string";
    case "select": {
      const allowed = (def.options ?? []).map(optionValue);
      return typeof value === "string" && allowed.includes(value)
        ? null
        : `must be one of ${allowed.map((option) => `"${option}"`).join(", ")}`;
    }
    default:
      return "has an unknown type";
  }
};

/** Checks caller-supplied params against the action's declaration; returns only declared ones. */
export const validateParams = (
  defs: ParamDef[] | undefined,
  params: Record<string, unknown> | undefined
): Record<string, unknown> => {
  const declared = defs ?? [];
  const input = params ?? {};
  const problems: string[] = [];
  const values: Record<string, unknown> = {};
  for (const name of Object.keys(input)) {
    if (!declared.some((def) => def.name === name)) {
      problems.push(`"${name}" is not a parameter of this action`);
    }
  }
  for (const def of declared) {
    // Own properties only: a param named like an `Object.prototype` member must not read it.
    const value = Object.hasOwn(input, def.name) ? input[def.name] : undefined;
    if (isEmpty(value)) {
      if (def.required) {
        problems.push(`"${def.name}" is required`);
      }
      continue;
    }
    const problem = problemWith(def, value);
    if (problem) {
      problems.push(`"${def.name}" ${problem}`);
    } else {
      values[def.name] = value;
    }
  }
  if (problems.length > 0) {
    throw new WorkflowError("invalid-params", `Invalid parameters: ${problems.join("; ")}.`);
  }
  return values;
};
