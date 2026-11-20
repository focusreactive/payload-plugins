import type { PreviewPathResolver } from "@focus-reactive/payload-plugin-seo/content";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { getPathFromBreadcrumbs } from "@/lib/utils/path/getPathFromBreadcrumbs";
import { getSlugPathPreview } from "@/lib/utils/path/getSlugPathPreview";
import type { Page } from "@/payload-types";

type Breadcrumbs = NonNullable<Page["breadcrumbs"]>;

const API_ROUTE = "/api";

const slugOf = (values: Record<string, unknown>): string | null =>
  typeof values.slug === "string" && values.slug !== "" ? values.slug : null;

const relationIdOf = (value: unknown): string | number | undefined => {
  if (typeof value === "string" || typeof value === "number")
    return value === "" ? undefined : value;
  if (value && typeof value === "object" && "id" in value) {
    return relationIdOf((value as { id: unknown }).id);
  }
  return undefined;
};

const breadcrumbsOf = (value: unknown): Breadcrumbs =>
  Array.isArray(value) ? (value as Breadcrumbs) : [];

// One request per parent and locale for the life of the admin tab: a page's path changes only
// when the parent itself is moved, and the next reload picks that up.
const parentPaths = new Map<string, Promise<string | undefined>>();

const loadParentPath = async (key: string, url: string): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { credentials: "include" });
    if (!response.ok) return undefined;
    const parent = (await response.json()) as { slug?: string | null; breadcrumbs?: unknown };
    return getPathFromBreadcrumbs(breadcrumbsOf(parent.breadcrumbs)) ?? parent.slug ?? undefined;
  } catch (error) {
    console.error("Failed to load the parent page path for the SEO preview", error);
    parentPaths.delete(key);
    return undefined;
  }
};

const fetchParentPath = (
  parentId: string | number,
  locale: string
): Promise<string | undefined> => {
  const key = `${parentId}:${locale}`;
  const cached = parentPaths.get(key);
  if (cached) return cached;

  const url = `${API_ROUTE}/page/${encodeURIComponent(parentId)}?depth=0&locale=${encodeURIComponent(locale)}&select[slug]=true&select[breadcrumbs]=true`;
  const request = loadParentPath(key, url);
  parentPaths.set(key, request);
  return request;
};

/**
 * Public path of a page for the SEO search-result preview, by the rules of the slug field and
 * `buildUrl`: parent pages, the slug as typed, the locale prefix. The parent's path comes from the
 * saved breadcrumbs while the parent is unchanged and has them in this locale, else from the API.
 */
const pagePreviewPath: PreviewPathResolver = async (values, { locale }) => {
  const slug = slugOf(values);
  if (!slug) return null;

  const resolvedLocale = locale ?? I18N_CONFIG.defaultLocale;
  const parentId = relationIdOf(values.parent);
  const breadcrumbs = breadcrumbsOf(values.breadcrumbs);
  const savedParentId = relationIdOf(breadcrumbs.at(-2)?.doc);

  let parentPath: string | undefined;
  if (parentId !== undefined) {
    parentPath =
      savedParentId !== undefined && String(savedParentId) === String(parentId)
        ? getPathFromBreadcrumbs(breadcrumbs.slice(0, -1))
        : await fetchParentPath(parentId, resolvedLocale);
  }

  return getSlugPathPreview({ collection: "page", locale: resolvedLocale, parentPath, slug }).path;
};

const postPreviewPath: PreviewPathResolver = (values, { locale }) => {
  const slug = slugOf(values);
  if (!slug) return null;

  return getSlugPathPreview({
    collection: BLOG_CONFIG.collection,
    locale: locale ?? I18N_CONFIG.defaultLocale,
    slug,
  }).path;
};

export const SEO_PREVIEW_PATHS: Record<string, PreviewPathResolver> = {
  page: pagePreviewPath,
  [BLOG_CONFIG.collection]: postPreviewPath,
};
