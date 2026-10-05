import { BLOG_CONFIG } from "@/lib/config/blog";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

export type CustomPageKey = "blog" | "search";

export interface CustomPageEntry {
  label: string;
  resolver: (locale: string) => string;
}

export const CUSTOM_PAGES_CONFIG: Record<CustomPageKey, CustomPageEntry> = {
  blog: {
    label: "Blog",
    resolver: (locale) =>
      shouldIncludeLocalePrefix(locale)
        ? `/${locale}${BLOG_CONFIG.basePath}`
        : BLOG_CONFIG.basePath,
  },
  search: {
    label: "Search",
    resolver: (locale) => (shouldIncludeLocalePrefix(locale) ? `/${locale}/search` : "/search"),
  },
};
