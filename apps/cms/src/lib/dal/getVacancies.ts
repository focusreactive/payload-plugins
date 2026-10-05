import type { Where } from "payload";
import { cache } from "react";

import { CAREERS_CONFIG } from "@/lib/config/careers";
import type { Locale } from "@/lib/types";
import { cacheTag } from "@/lib/utils/cacheTags";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import { scopedCache } from "@/lib/utils/scopedCache";

import { getPayloadClient } from "./payload-client";

function startOfToday(): string {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today.toISOString();
}

async function getOpenVacanciesQuery(locale: Locale, today: string) {
  const payload = await getPayloadClient();
  const open: Where = {
    and: [
      { _status: { equals: "published" } },
      { or: [{ closesAt: { exists: false } }, { closesAt: { greater_than_equal: today } }] },
    ],
  };

  const { docs } = await payload.find({
    collection: CAREERS_CONFIG.collection,
    depth: 0,
    limit: 100,
    locale,
    overrideAccess: true,
    pagination: false,
    select: {
      department: true,
      employmentType: true,
      location: true,
      publishedAt: true,
      slug: true,
      summary: true,
      title: true,
      workplace: true,
    },
    sort: "-publishedAt",
    where: open,
  });
  return docs;
}

/** Published vacancies whose closing day has not passed, newest first. */
export const getOpenVacancies = cache(async ({ locale }: { locale?: Locale } = {}) => {
  const resolvedLocale = await resolveLocale(locale);
  const today = startOfToday();

  return scopedCache(
    () => getOpenVacanciesQuery(resolvedLocale, today),
    ["openVacancies", resolvedLocale, today],
    { tags: [cacheTag({ locale: resolvedLocale, type: "vacanciesList" })] }
  )();
});
