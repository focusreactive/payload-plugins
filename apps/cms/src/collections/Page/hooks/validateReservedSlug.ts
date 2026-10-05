import { APIError } from "payload";
import type { CollectionBeforeChangeHook } from "payload";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { CAREERS_CONFIG } from "@/lib/config/careers";
import { NEWS_CONFIG } from "@/lib/config/news";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { buildUrl } from "@/lib/utils/path/buildUrl";
import type { Page } from "@/payload-types";

const segment = (path: string) => path.replace(/^\//u, "");

/** Addresses of hardcoded pages: a CMS page there would never be reachable. */
const RESERVED_PATHS = new Set(
  [BLOG_CONFIG.slug, BLOG_CONFIG.basePath, NEWS_CONFIG.listingPath, "/archives.html"].map(segment)
);

/** Hardcoded routes with children (/articles/<slug>, …): no page may live below them. */
const RESERVED_PREFIXES = new Set(
  [
    BLOG_CONFIG.postBasePath,
    BLOG_CONFIG.authorBasePath,
    BLOG_CONFIG.tagBasePath,
    NEWS_CONFIG.basePath,
    CAREERS_CONFIG.basePath,
  ].map(segment)
);

function reservedReason(segments: string[]): string | null {
  const [first] = segments;
  if (!first) {
    return null;
  }
  if (segments.length === 1 && RESERVED_PATHS.has(first)) {
    return `"/${first}" is a built-in page`;
  }
  if (segments.length > 1 && RESERVED_PREFIXES.has(first)) {
    return `pages cannot live below "/${first}"`;
  }
  return null;
}

export const validateReservedSlug: CollectionBeforeChangeHook<Page> = ({ data }) => {
  const reason = data?.slug && !data.parent ? reservedReason([data.slug]) : null;
  if (reason) {
    throw new APIError(`Slug "${data?.slug}" is reserved: ${reason}`, 400, undefined, true);
  }
  return data;
};

export const validateReservedPath: CollectionBeforeChangeHook<Page> = ({ data }) => {
  if (!data?.breadcrumbs) {
    return data;
  }

  const fullPath = buildUrl({
    absolute: false,
    breadcrumbs: data.breadcrumbs,
    collection: "page",
    // The default locale has no URL prefix, so the first segment is the page path itself.
    locale: I18N_CONFIG.defaultLocale,
  });
  const reason = reservedReason(fullPath.split("/").filter(Boolean));
  if (reason) {
    throw new APIError(`Path "${fullPath}" is reserved: ${reason}`, 400, undefined, true);
  }

  return data;
};
