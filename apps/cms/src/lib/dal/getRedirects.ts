import { cacheTag } from "@/lib/utils/cacheTags";
import { scopedCache } from "@/lib/utils/scopedCache";
import type { Locale } from "@/lib/types";
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
  scopedCache(async () => getRedirects(locale), ["redirects", locale], {
    tags: ["redirects", cacheTag({ locale, type: "redirect" })],
  });
