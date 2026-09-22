import { BLOG_CONFIG } from "@/lib/config/blog";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";
import { routing } from "@/lib/i18n/routing";
import type { Page } from "@/payload-types";

import { getServerSideURL } from "../../getURL";
import { getPathFromBreadcrumbs } from "../getPathFromBreadcrumbs";
import { resolvePath } from "./resolvePath";

type BuildUrlOptions = (
  | {
      collection: "page";
      breadcrumbs?: Page["breadcrumbs"];
      /**
       * A path already resolved from the path map (see `lib/dal/pathMap.ts`),
       * e.g. "/global-presence/asia/japan". Takes priority over `breadcrumbs`
       * when both are given, so a caller reading from the map never has to
       * shape its result back into a fake breadcrumbs array first.
       */
      path?: string | null;
      page?: never;
    }
  | {
      collection: "posts";
      breadcrumbs?: never;
      path?: never;
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
  path,
  absolute = true,
  page,
  slug,
  locale,
}: BuildUrlOptions): string {
  const baseUrl = getServerSideURL();
  const currentLocale = locale || routing.defaultLocale;
  const localePrefix = shouldIncludeLocalePrefix(currentLocale) ? `/${currentLocale}` : "";

  const breadcrumbsPath = path
    ? path.replace(/^\//, "")
    : breadcrumbs
      ? getPathFromBreadcrumbs(breadcrumbs)
      : undefined;

  const relativePath = resolvePath({
    basePath: collection === "posts" ? BLOG_CONFIG.basePath : undefined,
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
