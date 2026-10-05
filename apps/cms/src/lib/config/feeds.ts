/** Feed addresses of the old site (§5.5): /feeds/atom.xml, /feeds/rss.xml and one pair per tag. */
export const FEEDS = {
  allAtom: "/feeds/atom.xml",
  allRss: "/feeds/rss.xml",
  /** /feeds/<tag-slug>.atom.xml and .rss.xml */
  tagPattern: /^(.+)\.(atom|rss)\.xml$/u,
  limit: 50,
} as const;
