const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const deepMerge = <T>(target: T, source: object = {}): T => {
  if (!isPlainObject(target) || !isPlainObject(source)) return (source as T) ?? target;

  const merged: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    merged[key] =
      isPlainObject(value) && isPlainObject(merged[key]) ? deepMerge(merged[key], value) : value;
  }
  return merged as T;
};
