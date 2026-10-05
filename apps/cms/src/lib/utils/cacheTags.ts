import type { Locale } from "@/lib/types";

export type CacheTagParams =
  | { type: "post"; slug: string; locale: Locale }
  | { type: "postsList"; locale: Locale }
  | { type: "vacancy"; slug: string; locale: Locale }
  | { type: "vacanciesList"; locale: Locale }
  | { type: "newsItem"; slug: string; locale: Locale }
  | { type: "newsList"; locale: Locale }
  | { type: "page"; path: string; locale: Locale }
  | { type: "redirect"; locale: Locale }
  | { type: "sitemap" };

export function cacheTag(params: CacheTagParams): string {
  if (params.type === "sitemap") {
    return "sitemap";
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
    case "vacancy": {
      return `vacancy_${params.slug}_${locale}`;
    }
    case "vacanciesList": {
      return `vacancies_${locale}`;
    }
    case "newsItem": {
      return `news_${params.slug}_${locale}`;
    }
    case "newsList": {
      return `news_list_${locale}`;
    }
    case "redirect": {
      return `redirect_${locale}`;
    }
  }
}
