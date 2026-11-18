import { BLOG_CONFIG } from "@/lib/config/blog";
import type { Page } from "@/payload-types";

import { resolvePath } from "./buildUrl/resolvePath";
import { getPathFromBreadcrumbs } from "./getPathFromBreadcrumbs";

interface DocumentReference {
  relationTo: string;
  value: unknown;
}

export function getDocumentPath({ relationTo, value }: DocumentReference): string | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const { breadcrumbs, slug } = value as Partial<Pick<Page, "breadcrumbs" | "slug">>;

  if (relationTo === BLOG_CONFIG.collection) {
    return slug ? resolvePath({ basePath: BLOG_CONFIG.basePath, slug }) : undefined;
  }

  const breadcrumbsPath = getPathFromBreadcrumbs(breadcrumbs);
  if (!breadcrumbsPath && !slug) {
    return undefined;
  }

  return resolvePath({ breadcrumbsPath, slug }) || "/";
}
