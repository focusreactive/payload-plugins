/**
 * Checks if a value is empty.
 * Empty means: undefined, null, empty string (after trim), empty array, or empty object.
 *
 * Note: Does not handle complex types like richText.
 * Use composition with type-specific checks (e.g., isEmptyRichText) for those.
 */
export function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null) {return true;}
  if (typeof value === "string" && value.trim() === "") {return true;}
  if (Array.isArray(value) && value.length === 0) {return true;}
  if (typeof value === "object" && Object.keys(value).length === 0) {return true;}
  return false;
}
