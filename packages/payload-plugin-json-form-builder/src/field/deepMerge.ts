const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

// Overrides laid over defaults, one key at a time, so an override of `admin` keeps the defaults it
// does not mention. Written as a loop over a copy rather than a spread per key: the accumulator is
// rebuilt on every entry that way, which is quadratic on a config of any size.
export const deepMerge = <T>(target: T, source: object = {}): T => {
  if (!isPlainObject(target) || !isPlainObject(source)) return (source as T) ?? target;

  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    merged[key] =
      isPlainObject(value) && isPlainObject(merged[key]) ? deepMerge(merged[key], value) : value;
  }
  return merged as T;
};
