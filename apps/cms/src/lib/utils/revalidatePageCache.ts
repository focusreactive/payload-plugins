import { revalidateTag } from "next/cache";
import type { Payload } from "payload";

import type { Page } from "@/payload-types";

import type { Locale } from "../types";
import { cacheTag } from "./cacheTags";

/**
 * The page content itself is no longer cached under a per-path tag (see
 * pathMap.ts's file header for why that can't be invalidated correctly once
 * slugs are localized - `revalidatePage.ts` calls `revalidatePathMap()`
 * separately for that). This is left to revalidate the sitemap, which is
 * still cached under one fixed tag.
 */
export function revalidatePageCache(params: { doc: Page; locale: Locale; payload: Payload }): void {
  params.payload.logger?.info?.(`Revalidating sitemap after change to page: ${params.doc.slug}`);
  revalidateTag(cacheTag({ type: "sitemap" }), "max");
}
