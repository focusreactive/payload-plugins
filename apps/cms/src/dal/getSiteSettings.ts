import { draftMode } from "next/headers";

import { resolveLocale } from "@/core/lib/resolveLocale";
import type { Locale } from "@/core/types";
import type { SiteSetting } from "@/payload-types";

import { getCachedGlobal } from "./getGlobals";

export const getSiteSettings = async ({
  locale,
}: {
  locale?: Locale;
}): Promise<SiteSetting> => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);

  return await getCachedGlobal("site-settings", 2, resolvedLocale, draft)();
};
