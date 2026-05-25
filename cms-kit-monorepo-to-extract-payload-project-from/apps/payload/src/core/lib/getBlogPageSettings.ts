import { draftMode } from "next/headers";

import type { Locale } from "@/core/types";
import type { SiteSetting } from "@/payload-types";

import { getCachedGlobal } from "./getGlobals";
import { resolveLocale } from "./resolveLocale";

export interface BlogPageSettingsData {
  blogTitle?: string | null;
  blogDescription?: string | null;
  readMoreLabel?: string | null;
  relatedPostsLabel?: string | null;
  blogMeta?: NonNullable<SiteSetting["blog"]>["blogMeta"];
}

export const getBlogPageSettings = async ({
  locale,
}: {
  locale?: Locale;
}): Promise<BlogPageSettingsData> => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);

  const settings = (await getCachedGlobal(
    "site-settings",
    1,
    resolvedLocale,
    draft
  )()) as SiteSetting;

  return {
    blogDescription: settings?.blog?.blogDescription,
    blogMeta: settings?.blog?.blogMeta,
    blogTitle: settings?.blog?.blogTitle,
    readMoreLabel: settings?.blog?.readMoreLabel,
    relatedPostsLabel: settings?.blog?.relatedPostsLabel,
  };
};
