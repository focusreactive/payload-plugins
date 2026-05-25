import { revalidateTag } from "next/cache";
import type { Payload } from "payload";

import type { Page } from "@/payload-types";

import type { Locale } from "../types";
import { getPathFromBreadcrumbs } from "../utils/path/getPathFromBreadcrumbs";
import { cacheTag } from "./cacheTags";

export function revalidatePageCache(params: {
  doc: Page;
  locale: Locale;
  payload: Payload;
}): void {
  const path = getPathFromBreadcrumbs(params.doc.breadcrumbs) ?? "home";
  params.payload.logger?.info?.(
    `Revalidating page with slug: ${params.doc.slug}`
  );
  revalidateTag(cacheTag({ locale: params.locale, path, type: "page" }), "max");
  revalidateTag(cacheTag({ type: "sitemap" }), "max");
}
