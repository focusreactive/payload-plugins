export type PlainObject = Record<string, unknown>;

export const isPlainObject = (value: unknown): value is PlainObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);
