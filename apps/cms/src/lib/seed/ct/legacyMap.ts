import { EXTRA_LEGACY, IA, iaBySource } from "./data/ia";
import { articleSlug, isNewsEntry } from "./parseDump";
import type { ParsedPage, ParsedPost } from "./types";

const ARTICLES = "/articles";

function key(path: string): string {
  return path.toLowerCase().replace(/\/+$/u, "") || "/";
}

/** Both the `.html` and the extensionless form of an old path (lookups strip trailing slashes). */
function variants(path: string): string[] {
  const base = key(path);
  if (base === "/") {
    return [];
  }
  return base.endsWith(".html") ? [base, base.slice(0, -5)] : [base, `${base}.html`];
}

/** Pages of the new site, including the old indexes kept as built-in pages: never redirected. */
const NEW_PAGES = new Set([
  ...IA.map((page) => key(page.path)),
  "/news.html",
  "/updates.html",
  "/archives.html",
]);

/**
 * Old URL → new path for the proxy (plan §5.4 / §7 "Legacy map"): marketing pages via their dump
 * entry, every seeded blog post in its old shape (with/without .html; trailing slashes are
 * normalised by the lookup), and the fixed extras (index, listings, contact…). News, author and tag
 * pages keep their old addresses, so they need no entry.
 */
export function buildLegacyMap(pages: ParsedPage[], posts: ParsedPost[]): Record<string, string> {
  const map: Record<string, string> = {};
  const blogPosts = posts.filter((entry) => !isNewsEntry(entry));
  // A post answers on its own old address; no variant may redirect away from a real post.
  const postPaths = new Set(blogPosts.map((post) => key(`${ARTICLES}/${articleSlug(post)}`)));
  const add = (from: string, to: string) => {
    if (key(from) !== key(to) && !NEW_PAGES.has(key(from)) && !postPaths.has(key(from))) {
      map[key(from)] = to;
    }
  };

  for (const page of pages) {
    const target = iaBySource(page.number);
    if (target) {
      for (const from of variants(page.legacyPath)) {
        add(from, target.path);
      }
    }
  }
  for (const post of blogPosts) {
    const target = `${ARTICLES}/${articleSlug(post)}`;
    const name = target
      .split("/")
      .pop()!
      .replace(/\.html$/u, "");
    // The old site answered every post with and without the year and the .html suffix.
    for (const from of [...variants(post.legacyPath), ...variants(`${ARTICLES}/${name}`)]) {
      add(from, target);
    }
  }
  for (const [from, to] of Object.entries(EXTRA_LEGACY)) {
    add(from, to);
  }

  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}
