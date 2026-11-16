import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import type { SiteSetting } from "@/payload-types";

const DEFAULT_SITE_NAME = "Site";
const DEFAULT_TITLE_SEPARATOR = "|";

type TitleParts = { separator: string; siteName: string; suffix: string };

export const titlePartsOf = (settings: Partial<SiteSetting> | null | undefined): TitleParts => {
  const siteName = stripMarkers(settings?.general?.siteName) || DEFAULT_SITE_NAME;
  return {
    separator: stripMarkers(settings?.seo?.titleSeparator) || DEFAULT_TITLE_SEPARATOR,
    siteName,
    suffix: stripMarkers(settings?.seo?.titleSuffix) || siteName,
  };
};

export function buildPageTitle(
  baseTitle: string,
  { separator, siteName, suffix }: TitleParts
): string {
  if (baseTitle === suffix || baseTitle === siteName) {
    return baseTitle;
  }

  return `${baseTitle} ${separator} ${suffix}`;
}
