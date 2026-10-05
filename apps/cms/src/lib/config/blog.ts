export const BLOG_CONFIG = {
  /** Author and tag pages keep the old site's top-level addresses: /author/<slug>, /tag/<slug>. */
  authorBasePath: "/author",
  basePath: "/blog",
  collection: "posts",
  postsPerPage: 10,
  slug: "blog",
  tagBasePath: "/tag",
} as const;
