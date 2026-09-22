import type { Metadata } from "next";

import { I18N_CONFIG } from "@/lib/config/i18n";
import { generateMeta } from "@/lib/utils/generateMeta";
import { generateNotFoundMeta } from "@/lib/utils/generateNotFoundMeta";
import type { Locale } from "@/lib/types";
import { getPageBySlug } from "@/dal/getPageBySlug";

export { default } from "./[...slug]/page";

interface Props {
  params: Promise<{ locale: Locale }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageBySlug(["home"], locale);
  if (!page) {
    return generateNotFoundMeta({ locale });
  }
  return generateMeta({ collection: "page", doc: page, locale });
}

// getPageBySlug reads draftMode(), so a static regeneration of these routes throws
// DYNAMIC_SERVER_USAGE the moment the database has content. The sandbox serves three
// people on one call, so rendering per request costs nothing worth keeping.
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return I18N_CONFIG.locales.map((locale) => ({
    locale: locale.code,
  }));
}
