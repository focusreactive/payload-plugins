/** The value when it is a string, else an empty string. */
export const toText = (value: unknown): string => (typeof value === "string" ? value : "");

/** The value when it is a non-empty string, else `null`. */
export const textOrNull = (value: unknown): string | null =>
  typeof value === "string" && value !== "" ? value : null;

/**
 * One locale's text of a field that holds an object per locale when localized: that locale's own
 * value, else the default locale's. A plain string is a field that is not localized.
 */
export const pickLocalized = (value: unknown, key: string, defaultKey: string): string => {
  if (value && typeof value === "object") {
    const byLocale = value as Record<string, unknown>;

    return toText(byLocale[key]) || toText(byLocale[defaultKey]);
  }

  return toText(value);
};
