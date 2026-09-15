/**
 * Base paths for the two hand-written archive routes, mirroring BLOG_CONFIG.
 *
 * They exist because buildUrl resolves a canonical from a base path, and until now there was no
 * base path to hand it for either route - which is why both shipped a page with no canonical, no
 * og:url and no JSON-LD `url`. Declared once so the canonical, the JSON-LD and any future
 * sitemap entry cannot disagree about where a talk lives.
 *
 * `/browse-topics` rather than `/topics` because it is the segment the client's existing site
 * already publishes; keeping it means no redirect is owed at launch.
 */
export const TALKS_CONFIG = {
  basePath: "/talks",
} as const;

export const TOPICS_CONFIG = {
  basePath: "/browse-topics",
} as const;
