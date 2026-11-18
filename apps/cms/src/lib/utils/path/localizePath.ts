import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

export function localizePath(path: string, locale: string): string {
  if (!shouldIncludeLocalePrefix(locale)) {
    return path;
  }

  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
