import type { Metadata } from "next";

import { I18N_CONFIG } from "@/core/config/i18n";
import { generateMeta } from "@/core/lib/generateMeta";
import { generateNotFoundMeta } from "@/core/lib/generateNotFoundMeta";
import { getPageBySlug } from "@/core/lib/getPageBySlug";
import type { Locale } from "@/core/types";

export { default } from "./[...slug]/page";

interface Props { params: Promise<{ locale: Locale }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const page = await getPageBySlug(["home"], locale);
  if (!page) {return generateNotFoundMeta({ locale });}
  return generateMeta({ collection: "page", doc: page, locale });
}

export async function generateStaticParams() {
  return I18N_CONFIG.locales.map((locale) => ({
    locale: locale.code,
  }));
}
