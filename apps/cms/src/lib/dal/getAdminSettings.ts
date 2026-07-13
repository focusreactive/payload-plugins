import { draftMode } from "next/headers";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import type { SiteSetting } from "@/payload-types";

import { getCachedGlobal } from "./getGlobals";

export const getAdminSettings = async ({ locale }: { locale?: Locale } = {}): Promise<
  NonNullable<SiteSetting["adminPanel"]>
> => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);

  const settings = (await getCachedGlobal(
    "site-settings",
    1,
    resolvedLocale,
    draft
  )()) as SiteSetting;

  return settings.adminPanel ?? {};
};
