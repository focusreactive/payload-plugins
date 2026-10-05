import { I18N_CONFIG } from "@/lib/config/i18n";

export function shouldIncludeLocalePrefix(locale: string) {
  const isDefaultLocale = locale === I18N_CONFIG.defaultLocale;

  return (
    I18N_CONFIG.localePrefix === "always" ||
    (I18N_CONFIG.localePrefix === "as-needed" && !isDefaultLocale)
  );
}

const LOCALE_SEGMENT = new RegExp(
  `^/(${I18N_CONFIG.locales.map((l) => l.code).join("|")})(/|$)`,
  "u"
);

/** Prefixes a site-relative path with the locale; external URLs, anchors and prefixed paths pass through. */
export function localizePath(path: string, locale: string): string {
  if (!path.startsWith("/") || path.startsWith("//") || LOCALE_SEGMENT.test(path)) {
    return path;
  }
  if (!shouldIncludeLocalePrefix(locale)) {
    return path;
  }
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
