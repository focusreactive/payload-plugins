type NamespacedTranslations = Record<string, Record<string, unknown>>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeTranslations(
  base: NamespacedTranslations,
  extra: NamespacedTranslations
): NamespacedTranslations {
  const out: NamespacedTranslations = { ...base };

  for (const [language, namespaces] of Object.entries(extra)) {
    const merged: Record<string, unknown> = { ...out[language] };
    for (const [namespace, value] of Object.entries(namespaces)) {
      const existing = merged[namespace];
      merged[namespace] =
        isPlainObject(existing) && isPlainObject(value) ? { ...existing, ...value } : value;
    }
    out[language] = merged;
  }

  return out;
}
