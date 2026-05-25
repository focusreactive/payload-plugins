import type { Label } from "../types";

export function resolveLabel(label: Label, locale: string) {
  if (!label) {return null;}

  if (typeof label === "string") {return label;}

  return label[locale] ?? label.en ?? Object.values(label)[0] ?? null;
}
