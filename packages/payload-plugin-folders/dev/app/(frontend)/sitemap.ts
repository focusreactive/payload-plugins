import config from "@payload-config";
import { buildUrl, getAllPaths } from "@focus-reactive/payload-plugin-folders/server";
import type { MetadataRoute } from "next";
import { getPayload } from "payload";

const siteUrl = process.env.SITE_URL ?? "http://localhost:4078";

/** One entry per published page and locale, each naming its translations. */
const sitemap = async (): Promise<MetadataRoute.Sitemap> => {
  const payload = await getPayload({ config });
  const rows = await getAllPaths(payload, { locale: "all" });
  const defaultLocale = payload.config.localization
    ? payload.config.localization.defaultLocale
    : null;
  const urlOf = (fullPath: string, locale: string | null): string =>
    `${siteUrl}${buildUrl(fullPath, locale, { defaultLocale: defaultLocale ?? undefined })}`;

  return rows.map((row) => {
    const translations = rows.filter(
      (other) => other.collection === row.collection && String(other.id) === String(row.id)
    );

    return {
      alternates: {
        languages: Object.fromEntries(
          translations
            .filter((translation) => translation.locale !== null)
            .map((translation) => [
              translation.locale as string,
              urlOf(translation.fullPath, translation.locale),
            ])
        ),
      },
      lastModified: row.updatedAt,
      url: urlOf(row.fullPath, row.locale),
    };
  });
};

export default sitemap;
