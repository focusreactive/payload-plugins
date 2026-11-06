export const isId = (value: unknown): value is string | number =>
  typeof value === "string" || typeof value === "number";
