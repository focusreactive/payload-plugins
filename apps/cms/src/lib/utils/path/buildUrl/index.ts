import { BLOG_CONFIG } from "@/lib/config/blog";
import { CAREERS_CONFIG } from "@/lib/config/careers";
import { NEWS_CONFIG } from "@/lib/config/news";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";
import { routing } from "@/lib/i18n/routing";
import type { Page } from "@/payload-types";

import { getServerSideURL } from "../../getURL";
import { getPathFromBreadcrumbs } from "../getPathFromBreadcrumbs";
import { resolvePath } from "./resolvePath";

const BASE_PATHS = {
  authors: BLOG_CONFIG.authorBasePath,
  news: NEWS_CONFIG.basePath,
  page: undefined,
  posts: BLOG_CONFIG.basePath,
  tags: BLOG_CONFIG.tagBasePath,
  vacancies: CAREERS_CONFIG.basePath,
} as const;

type BuildUrlOptions = (
  | {
      collection: "page";
      breadcrumbs?: Page["breadcrumbs"];
      page?: never;
    }
  | {
      collection: "posts";
      breadcrumbs?: never;
      page?: number;
    }
  | {
      collection: "vacancies" | "news" | "authors" | "tags";
      breadcrumbs?: never;
      page?: never;
    }
) & {
  absolute?: boolean;
  slug?: string | null;
  locale: string;
};

export function buildUrl({
  collection,
  breadcrumbs,
  absolute = true,
  page,
  slug,
  locale,
}: BuildUrlOptions): string {
  const baseUrl = getServerSideURL();
  const currentLocale = locale || routing.defaultLocale;
  const localePrefix = shouldIncludeLocalePrefix(currentLocale) ? `/${currentLocale}` : "";

  const breadcrumbsPath = breadcrumbs ? getPathFromBreadcrumbs(breadcrumbs) : undefined;

  const relativePath = resolvePath({
    // A post lives under /articles; the bare posts URL (and its pages) is the blog listing.
    basePath: collection === "posts" && slug ? BLOG_CONFIG.postBasePath : BASE_PATHS[collection],
    breadcrumbsPath,
    page,
    slug,
  });

  const fullPath = `${localePrefix}${relativePath}`;

  if (!absolute) {
    return fullPath;
  }

  return `${baseUrl}${fullPath}`;
}
