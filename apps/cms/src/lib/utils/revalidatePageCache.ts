import type { Payload } from "payload";

import type { Page } from "@/payload-types";

import type { Locale } from "../types";
import { getPathFromBreadcrumbs } from "../utils/path/getPathFromBreadcrumbs";
import { cacheTag } from "./cacheTags";
import { revalidateScopedTag } from "./scopedCache";

export function revalidatePageCache(params: {
  doc: Pick<Page, "breadcrumbs" | "slug">;
  locales: readonly Locale[];
  payload: Payload;
}): void {
  const path = getPathFromBreadcrumbs(params.doc.breadcrumbs) ?? "home";
  params.payload.logger?.info?.(`Revalidating page with slug: ${params.doc.slug}`);
  for (const locale of params.locales) {
    revalidateScopedTag(cacheTag({ locale, path, type: "page" }), { expire: 0 });
  }
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
}

export function revalidateAllPagePaths(payload: Payload): void {
  payload.logger?.info?.("Revalidating every cached page path");
  revalidateScopedTag(cacheTag({ type: "pagePaths" }), { expire: 0 });
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
}
