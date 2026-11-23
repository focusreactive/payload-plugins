import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type { Metadata } from "next";

import { getSiteSettings } from "@/dal/getSiteSettings";

import type { Locale } from "../types";
import { buildPageTitle, titlePartsOf } from "./buildPageTitle";

export async function generateNotFoundMeta({ locale }: { locale: Locale }): Promise<Metadata> {
  const settings = await getSiteSettings({ locale });

  const baseTitle = stripMarkers(settings.notFound?.title) || "404 - Page not found";
  const description =
    stripMarkers(settings.notFound?.description) ||
    "Unfortunately, the requested page does not exist or has been deleted.";
  const title = buildPageTitle(baseTitle, titlePartsOf(settings));

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
