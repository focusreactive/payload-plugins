import { isRecord } from "../isRecord";

type NamespacedTranslations = Record<string, Record<string, unknown>>;

export function mergeTranslations(
  base: NamespacedTranslations,
  extra: NamespacedTranslations
): NamespacedTranslations {
  const out: NamespacedTranslations = { ...base };

  for (const [language, namespaces] of Object.entries(extra)) {
    const merged: Record<string, unknown> = { ...out[language] };
    for (const [namespace, value] of Object.entries(namespaces)) {
      const existing = merged[namespace];
      merged[namespace] = isRecord(existing) && isRecord(value) ? { ...existing, ...value } : value;
    }
    out[language] = merged;
  }

  return out;
}
