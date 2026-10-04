/** Plan T7 §3: the dump has no tags, so these categories stand in for them. */
export interface CategoryRule {
  slug: string;
  title: string;
  /** Keyword test on title + slug + first 600 chars; null = assigned by template / fallback. */
  pattern: RegExp | null;
}

export const NEWS_CATEGORY = "news";
export const FALLBACK_CATEGORY = "engineering";

export const CATEGORIES: CategoryRule[] = [
  { pattern: null, slug: NEWS_CATEGORY, title: "News & Announcements" },
  {
    pattern: /safety|trustable|\btsf\b|iec 61508|iso 26262|\bstpa\b|rafia/iu,
    slug: "trustable-safety",
    title: "Trustable & Safety",
  },
  { pattern: /risc-v|riscv|cva6/iu, slug: "risc-v", title: "RISC-V" },
  {
    pattern: /buildstream|buildgrid|bazel|remote execution|reapi|\bbuild\b/iu,
    slug: "build-engineering",
    title: "Build Engineering",
  },
  { pattern: /kernel|driver|\bbsp\b|systemd|glibc/iu, slug: "linux-kernel", title: "Linux Kernel" },
  {
    pattern: /automotive|vehicle|\bsdv\b|\bagl\b|genivi|android automotive/iu,
    slug: "automotive",
    title: "Automotive",
  },
  { pattern: /medical|bloodlight|brain scanner/iu, slug: "medical", title: "Medical" },
  {
    pattern: /gnome|freedesktop|flathub|flatpak|outreachy|open source/iu,
    slug: "open-source-community",
    title: "Open Source & Community",
  },
  { pattern: /fosdem|guadec|summit|conference|meetup|\bces\b/iu, slug: "events", title: "Events" },
  {
    pattern: /meet the|interview|women|lgbt|remote working|lockdown|onboarding/iu,
    slug: "people-culture",
    title: "People & Culture",
  },
  { pattern: null, slug: FALLBACK_CATEGORY, title: "Engineering" },
];

/** News template → news; otherwise up to 2 keyword matches in rule order; none → Engineering. */
export function assignCategories(post: {
  template: string;
  title: string;
  slug: string;
  markdown: string;
}): string[] {
  if (post.template === "T-NEWS-POST") {
    return [NEWS_CATEGORY];
  }
  const haystack = `${post.title} ${post.slug} ${post.markdown.slice(0, 600)}`;
  const matches = CATEGORIES.filter((rule) => rule.pattern?.test(haystack)).map(
    (rule) => rule.slug
  );
  return matches.length > 0 ? matches.slice(0, 2) : [FALLBACK_CATEGORY];
}
