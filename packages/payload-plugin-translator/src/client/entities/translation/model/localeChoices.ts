import type { LocaleCode } from "../../../../types/wire/primitives.js";

/** A host locale as the panel names it. */
export type LocaleChoice = { code: LocaleCode; label: string };

/** The slice of Payload's localization config the panel reads; a label may be per admin language. */
type HostLocale = { code: string; label?: string | Record<string, string> };

const ADMIN_LANGUAGE = "en";

function labelOf({ code, label }: HostLocale): string {
  if (typeof label === "string") return label;
  if (label) return label[ADMIN_LANGUAGE] ?? Object.values(label)[0] ?? code;
  return code;
}

export function localeChoicesOf(locales: readonly HostLocale[]): LocaleChoice[] {
  return locales.map((locale) => ({ code: locale.code, label: labelOf(locale) }));
}
