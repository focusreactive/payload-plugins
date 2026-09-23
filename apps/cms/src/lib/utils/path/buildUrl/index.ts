import { BLOG_CONFIG } from "@/lib/config/blog";
import { TALKS_CONFIG, TOPICS_CONFIG } from "@/lib/config/talks";
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
      page?: never;
    }
  | {
      collection: "posts";
      breadcrumbs?: never;
      page?: number;
    }
  // The two archive collections render from hand-written routes rather than from Page documents,
  // so they have a fixed base path and no breadcrumb chain and no pagination of their own.
  | {
      collection: "talk" | "topic";
      breadcrumbs?: never;
      page?: never;
    }
) & {
  absolute?: boolean;
  slug?: string | null;
  locale: string;
};

const BASE_PATHS: Record<Exclude<BuildUrlOptions["collection"], "page">, string> = {
  posts: BLOG_CONFIG.basePath,
  talk: TALKS_CONFIG.basePath,
  topic: TOPICS_CONFIG.basePath,
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
    basePath: collection === "page" ? undefined : BASE_PATHS[collection],
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
