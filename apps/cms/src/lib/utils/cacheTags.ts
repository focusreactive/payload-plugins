import type { Locale } from "@/lib/types";

export type CacheTagParams =
  | { type: "post"; slug: string; locale: Locale }
  | { type: "postsList"; locale: Locale }
  | { type: "page"; path: string; locale: Locale }
  | { type: "redirect"; locale: Locale }
  | { type: "pagePaths" }
  | { type: "sitemap" };

export function cacheTag(params: CacheTagParams): string {
  if (params.type === "sitemap") {
    return "sitemap";
  }

  if (params.type === "pagePaths") {
    return "page_paths";
  }

  const { type, locale } = params;

  switch (type) {
    case "page": {
      return `page_${params.path}_${locale}`;
    }
    case "post": {
      return `post_${params.slug}_${locale}`;
    }
    case "postsList": {
      return `posts_${locale}`;
    }
    case "redirect": {
      return `redirect_${locale}`;
    }
  }
}
