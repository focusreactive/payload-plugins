export const LOCALES = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
] as const;

export type LocaleCode = (typeof LOCALES)[number]["code"];

export const isLocale = (value: string | undefined): value is LocaleCode =>
  LOCALES.some((l) => l.code === value);
