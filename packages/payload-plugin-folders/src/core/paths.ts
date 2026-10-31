export type LocalePrefixMode = "all" | "non-default" | "none";

const repeatedSlashes = /\/{2,}/gu;

/**
 * Leading slash, no trailing slash, lowercase, no repeated slashes. The site root is `/`.
 * Callers that take a URL from a request (P-31 resolve) must percent-decode it first.
 */
export const normalizePath = (path: string): string => {
  const collapsed = path.trim().toLowerCase().replace(repeatedSlashes, "/");
  const withoutTrailingSlash = collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;

  return withoutTrailingSlash.startsWith("/") ? withoutTrailingSlash : `/${withoutTrailingSlash}`;
};

export const splitPath = (path: string): string[] =>
  normalizePath(path)
    .split("/")
    .filter((segment) => segment !== "");

/** Joins any mix of paths and bare segments into one normalised path. */
export const joinPath = (...parts: string[]): string => normalizePath(parts.join("/"));

/** The path one level up; `/a` gives `/`, and the site root has no parent. */
export const parentPathOf = (path: string): string | null => {
  const segments = splitPath(path);
  if (segments.length === 0) {
    return null;
  }

  return joinPath(...segments.slice(0, -1));
};

/** Every non-root ancestor path including the path itself, longest first: `/a/b/c`, `/a/b`, `/a`. */
export const prefixesOf = (path: string): string[] => {
  const segments = splitPath(path);

  return segments.map((_, index) => joinPath(...segments.slice(0, segments.length - index)));
};

/** Number of segments; the site root is 0. */
export const pathDepth = (path: string): number => splitPath(path).length;

export type BuildUrlOptions = {
  /** Needed for `non-default`: the locale that gets no prefix. */
  defaultLocale?: string;
  localePrefix?: LocalePrefixMode;
};

/** Adds the locale prefix to a stored path. Stored paths never carry one. */
export const buildUrl = (
  fullPath: string,
  locale: string | null,
  { defaultLocale, localePrefix = "non-default" }: BuildUrlOptions = {}
): string => {
  if (localePrefix === "non-default" && locale !== null && defaultLocale === undefined) {
    throw new Error(
      'buildUrl needs `defaultLocale` when localePrefix is "non-default" and a locale is given'
    );
  }
  const path = normalizePath(fullPath);
  const needsPrefix =
    locale !== null &&
    (localePrefix === "all" || (localePrefix === "non-default" && locale !== defaultLocale));
  if (!needsPrefix) {
    return path;
  }

  return path === "/" ? `/${locale}` : `/${locale}${path}`;
};

/** Storyblok's `full_slug`: no leading slash, and a trailing slash on a folder's root page. */
export const toStoryblokFullSlug = (fullPath: string, isFolderRoot: boolean): string => {
  const segments = splitPath(fullPath);
  if (segments.length === 0) {
    return "";
  }

  return `${segments.join("/")}${isFolderRoot ? "/" : ""}`;
};

/**
 * A page's path from its folder's path (`/` or an empty string at the top level), its segment and
 * its root flag: a root page takes its folder's path, any other page its folder's path plus its
 * own segment. The browser composes the path of unsaved form values with this, so the edit view
 * can say what a save will change; `null` while a page has no segment yet.
 */
export const composeFullPath = ({
  folderPath,
  isFolderRoot,
  segment,
}: {
  folderPath: string;
  isFolderRoot: boolean;
  segment: string;
}): string | null => {
  if (isFolderRoot) {
    return joinPath(folderPath === "" ? "/" : folderPath);
  }

  return segment === "" ? null : joinPath(folderPath, segment);
};
