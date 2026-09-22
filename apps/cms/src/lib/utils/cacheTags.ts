import type { Locale } from "@/lib/types";

// The old `{ type: "page" }` variant tagged a cache entry by its path
// ("page_<path>_<locale>"). Once a slug is localized, a rename changes the
// path, and a tag naming the OLD path is never revalidated - there is no
// write left that would ask for it. `lib/dal/pathMap.ts` replaces this with
// a single id-keyed map under one tag, which a rename can always find.
export type CacheTagParams =
  | { type: "post"; slug: string; locale: Locale }
  | { type: "postsList"; locale: Locale }
  | { type: "redirect"; locale: Locale }
  | { type: "sitemap" };

export function cacheTag(params: CacheTagParams): string {
  if (params.type === "sitemap") {
    return "sitemap";
  }

  const { type, locale } = params;

  switch (type) {
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
