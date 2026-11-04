/** The value when it is a string, else an empty string. */
export const toText = (value: unknown): string => (typeof value === "string" ? value : "");

/** The value when it is a non-empty string, else `null`. */
export const textOrNull = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;
