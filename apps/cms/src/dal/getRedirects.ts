import { unstable_cache } from "next/cache";

import { cacheTag } from "@/core/lib/cacheTags";
import type { Locale } from "@/core/types";
import { getPayloadClient } from "@/dal/payload-client";

export async function getRedirects(locale: Locale) {
  const payload = await getPayloadClient();

  const { docs: redirects } = await payload.find({
    collection: "redirects",
    depth: 2,
    limit: 0,
    locale,
    pagination: false,
  });

  return redirects;
}

export const getCachedRedirects = ({ locale }: { locale: Locale }) =>
  unstable_cache(async () => getRedirects(locale), ["redirects", locale], {
    tags: ["redirects", cacheTag({ locale, type: "redirect" })],
  });
