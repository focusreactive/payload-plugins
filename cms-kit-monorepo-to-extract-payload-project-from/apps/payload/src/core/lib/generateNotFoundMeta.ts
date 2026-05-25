import type { Metadata } from "next";

import type { Locale } from "../types";
import { buildPageTitle } from "./buildPageTitle";
import { getSiteSettings } from "./getSiteSettings";

export async function generateNotFoundMeta({
  locale,
}: {
  locale: Locale;
}): Promise<Metadata> {
  const settings = await getSiteSettings({ locale });

  const baseTitle = settings.notFoundTitle || "404 - Page not found";
  const description =
    settings.notFoundDescription ||
    "Unfortunately, the requested page does not exist or has been deleted.";
  const separator = settings.seoTitleSeparator || "|";
  const suffix = settings.seoTitleSuffix || (settings.siteName as string);
  const siteName = settings.siteName || "Site";

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
