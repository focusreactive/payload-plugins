import { BLOG_CONFIG } from "@/lib/config/blog";
import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

import { resolvePath } from "./buildUrl/resolvePath";
import { localizePath } from "./localizePath";

interface SlugPathPreviewArgs {
  collection: string | undefined;
  locale: string;
  /** Parent page path without leading slash (e.g. `services/web`), pages only. */
  parentPath?: string;
  slug: string | null | undefined;
}

interface SlugPathPreview {
  /** True for the root page whose slug resolves to `/` (see `resolvePath`). */
  isHome: boolean;
  /** Public path of the document, locale prefix included (e.g. `/es/services/web`). */
  path: string;
  /** Non-editable part drawn before the slug input (e.g. `/es/services/`). */
  prefix: string;
}

/**
 * Splits a document's public path into the part the editor cannot change (locale,
 * `/blog`, parent pages) and the slug. Same rules as `buildUrl` / the list "URL" column.
 */
export function getSlugPathPreview({
  collection,
  locale,
  parentPath,
  slug,
}: SlugPathPreviewArgs): SlugPathPreview {
  const localePrefix = shouldIncludeLocalePrefix(locale) ? `/${locale}` : "";

  if (collection === BLOG_CONFIG.collection) {
    return {
      isHome: false,
      path: localizePath(resolvePath({ basePath: BLOG_CONFIG.basePath, slug }), locale),
      prefix: `${localePrefix}${BLOG_CONFIG.basePath}/`,
    };
  }

  const breadcrumbsPath = parentPath && slug ? `${parentPath}/${slug}` : undefined;
  const relativePath = resolvePath({ breadcrumbsPath, slug });

  return {
    isHome: Boolean(slug) && !relativePath,
    path: localizePath(relativePath || "/", locale),
    prefix: parentPath ? `${localePrefix}/${parentPath}/` : `${localePrefix}/`,
  };
}
