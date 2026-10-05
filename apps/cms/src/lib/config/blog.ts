export const BLOG_CONFIG = {
  /** Author and tag pages keep the old site's top-level addresses: /author/<slug>, /tag/<slug>. */
  authorBasePath: "/author",
  /** The blog listing keeps the old site address. */
  basePath: "/updates.html",
  collection: "posts",
  /** Posts keep the old site's addresses: /articles/<year>/<name>, /articles/<name>.html, … */
  postBasePath: "/articles",
  postsPerPage: 10,
  slug: "blog",
  tagBasePath: "/tag",
} as const;

export function postPath(slug: string | null | undefined): string {
  return `${BLOG_CONFIG.postBasePath}/${slug ?? ""}`;
}
