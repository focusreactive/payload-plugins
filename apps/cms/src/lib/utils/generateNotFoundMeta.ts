import type { Metadata } from "next";

import { getSiteSettings } from "@/dal/getSiteSettings";

import type { Locale } from "../types";
import { buildPageTitle } from "./buildPageTitle";

export async function generateNotFoundMeta({ locale }: { locale: Locale }): Promise<Metadata> {
  const settings = await getSiteSettings({ locale });

  const baseTitle = settings.notFound?.title || "404 - Page not found";
  const description =
    settings.notFound?.description ||
    "Unfortunately, the requested page does not exist or has been deleted.";
  const separator = settings.seo?.titleSeparator || "|";
  const suffix = settings.seo?.titleSuffix || (settings.general?.siteName as string);
  const siteName = settings.general?.siteName || "Site";

  const title = buildPageTitle(baseTitle, separator, suffix, siteName);

  return {
    alternates: {
      canonical: "/",
    },
    description,
    robots: {
      follow: true,
      index: false,
    },
    title,
  };
}
