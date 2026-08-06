import type { Payload } from "payload";
import { cache } from "react";

import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

export interface LocaleSlug {
  locale: Locale;
  slug: string;
  href: string;
}

/**
 * The slug is localized, so one page has a different address per language. A
 * reader on the English page has no way to reach the Italian one without this -
 * the two URLs share no path segment.
 *
 * `locale: "all"` returns the raw per-locale values instead of one resolved
 * value, and a locale nobody has translated is simply absent from the map,
 * which is what keeps the fallback from inventing an address that 404s.
 */
async function query(payload: Payload, id: number | string): Promise<LocaleSlug[]> {
  const document = await payload.findByID({
    collection: "generated-pages",
    depth: 0,
    disableErrors: true,
    id,
    locale: "all",
    overrideAccess: true,
  });

  const slugsByLocale = (document?.slug ?? {}) as unknown as Record<string, string | null>;

  return I18N_CONFIG.locales
    .map(({ code }) => ({ locale: code, slug: slugsByLocale[code] ?? "" }))
    .filter((entry): entry is { locale: Locale; slug: string } => Boolean(entry.slug))
    .map(({ locale, slug }) => ({
      href:
        locale === I18N_CONFIG.defaultLocale
          ? `/online-doctor/${slug}`
          : `/${locale}/online-doctor/${slug}`,
      locale,
      slug,
    }));
}

export const getGeneratedPageLocaleSlugs = cache(
  async (id: number | string): Promise<LocaleSlug[]> => query(await getPayloadClient(), id)
);
