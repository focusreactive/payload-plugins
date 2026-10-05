import { NEWS_CONFIG } from "@/lib/config/news";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { getPayloadClient } from "@/dal/payload-client";

export async function getNewsStaticParams(): Promise<{ locale: string; slug: string }[]> {
  const payload = await getPayloadClient();

  const perLocale = await Promise.all(
    I18N_CONFIG.locales.map(async ({ code }) => {
      const locale = code as Locale;
      const { docs } = await payload.find({
        collection: NEWS_CONFIG.collection,
        draft: false,
        limit: 1000,
        locale,
        overrideAccess: true,
        pagination: false,
        select: { slug: true },
        where: { _status: { equals: "published" } },
      });
      return docs.map((doc) => ({ locale, slug: doc.slug }));
    })
  );

  return perLocale.flat();
}
