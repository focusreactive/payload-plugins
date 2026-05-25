import { BLOG_CONFIG } from "@/core/config/blog";
import { shouldIncludeLocalePrefix } from "@/core/lib/localePrefix";
import { routing } from "@/i18n/routing";
import type { Page } from "@/payload-types";

import { getServerSideURL } from "../../../lib/getURL";
import { getPathFromBreadcrumbs } from "../getPathFromBreadcrumbs";
import { resolvePath } from "./resolvePath";

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
  const localePrefix = shouldIncludeLocalePrefix(currentLocale)
    ? `/${currentLocale}`
    : "";

  const breadcrumbsPath = breadcrumbs
    ? getPathFromBreadcrumbs(breadcrumbs)
    : undefined;

  const relativePath = resolvePath({
    basePath: collection === "posts" ? BLOG_CONFIG.basePath : undefined,
    breadcrumbsPath,
    page,
    slug,
  });

  const fullPath = `${localePrefix}${relativePath}`;

  if (!absolute) {return fullPath;}

  return `${baseUrl}${fullPath}`;
}
