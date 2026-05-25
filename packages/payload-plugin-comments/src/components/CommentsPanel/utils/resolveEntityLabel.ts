import type { EntityLabel } from "../../../types";

export function resolveEntityLabel(label: EntityLabel | undefined, locale: string, fallback: string) {
  if (label === undefined) return fallback;
  if (typeof label === "string") return label;

  const byLocale = label[locale];
  if (byLocale !== undefined) return byLocale;

  const byEn = label["en"];
  if (byEn !== undefined) return byEn;

  const first = Object.values(label)[0];

  return first ?? fallback;
}
