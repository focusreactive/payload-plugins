import { draftMode } from "next/headers";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Locale } from "@/lib/types";
import type { Footer, Header, SiteSetting } from "@/payload-types";
import { getPayloadClient } from "@/dal/payload-client";

import { getCachedGlobal } from "./getGlobals";

/**
 * Page's own header/footer fields carry a getSoleRelationId defaultValue
 * (collections/Page/basePageFields.ts), so every ordinary page resolves to the site's one
 * header/footer document even when nobody set it explicitly. notFound.header/notFound.footer
 * carry no such default and the seed never sets them, so an unseeded 404 page renders with
 * neither - silently, since Header and Footer both return null on a falsy data prop. Resolving
 * the same sole document here, at read time, keeps the 404 page consistent with the rest of the
 * site without needing seed data of its own; "sole" means exactly one, matching
 * getSoleRelationId's own ambiguity rule.
 */
async function getFallbackHeader(locale?: Locale): Promise<Header | undefined> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({ collection: "header", depth: 2, limit: 2, locale });
  return docs.length === 1 ? docs[0] : undefined;
}

async function getFallbackFooter(locale?: Locale): Promise<Footer | undefined> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({ collection: "footer", depth: 2, limit: 2, locale });
  return docs.length === 1 ? docs[0] : undefined;
}

export const getNotFoundSettings = async ({
  locale,
}: {
  locale?: Locale;
}): Promise<NonNullable<SiteSetting["notFound"]>> => {
  const { isEnabled: draft } = await draftMode();
  const resolvedLocale = await resolveLocale(locale);

  const settings = (await getCachedGlobal(
    "site-settings",
    2,
    resolvedLocale,
    draft
  )()) as SiteSetting;

  const notFound = settings.notFound ?? {};

  const [fallbackHeader, fallbackFooter] = await Promise.all([
    notFound.header ? undefined : getFallbackHeader(resolvedLocale),
    notFound.footer ? undefined : getFallbackFooter(resolvedLocale),
  ]);

  return {
    ...notFound,
    header: notFound.header ?? fallbackHeader,
    footer: notFound.footer ?? fallbackFooter,
  };
};
