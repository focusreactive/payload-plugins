import type { CollectionLabels } from "../../../types";

export function resolveCollectionLabel(
  label: CollectionLabels[string] | undefined,
  locale: string,
  fallback: string,
): string {
  if (label === undefined) return fallback;
  if (typeof label === "string") return label;

  const byLocale = label[locale];
  if (byLocale !== undefined) return byLocale;

  const byEn = label["en"];
  if (byEn !== undefined) return byEn;

  const first = Object.values(label)[0];

  return first ?? fallback;
}
