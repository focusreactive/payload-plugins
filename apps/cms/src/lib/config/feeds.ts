/**
 * Feed addresses (§5.5). The old site was Pelican, whose defaults these are: all.atom.xml,
 * all.rss.xml and one Atom feed per category. The live site could not be checked from the build
 * sandbox; adjust here if its <link rel="alternate"> tags differ.
 */
export const FEEDS = {
  allAtom: "/feeds/all.atom.xml",
  allRss: "/feeds/all.rss.xml",
  /** /feeds/<category-slug>.atom.xml and .rss.xml */
  categoryPattern: /^([a-z0-9-]+)\.(atom|rss)\.xml$/u,
  limit: 50,
} as const;
