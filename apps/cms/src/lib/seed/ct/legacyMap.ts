import { EXTRA_LEGACY, IA, iaBySource } from "./data/ia";
import { isNewsEntry } from "./parseDump";
import type { ParsedPage, ParsedPost } from "./types";

const BLOG = "/blog";
const BLOG_KEY = "/blog";

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

/** Paths of the new site: an old URL variant must never shadow one of them. */
const NEW_PATHS = new Set([...IA.map((page) => key(page.path)), BLOG_KEY]);

/**
 * Old URL → new path for the proxy (plan §5.4 / §7 "Legacy map"): marketing pages via their dump
 * entry, every seeded blog post in its old shape (with/without .html; trailing slashes are
 * normalised by the lookup), and the fixed extras (index, listings, contact…). News, author and tag
 * pages keep their old addresses, so they need no entry.
 */
export function buildLegacyMap(pages: ParsedPage[], posts: ParsedPost[]): Record<string, string> {
  const map: Record<string, string> = {};
  const add = (from: string, to: string) => {
    if (key(from) !== key(to) && !NEW_PATHS.has(key(from)) && !key(from).startsWith(`${BLOG}/`)) {
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
  for (const post of posts.filter((entry) => !isNewsEntry(entry))) {
    for (const from of variants(post.legacyPath)) {
      add(from, `${BLOG}/${post.slug}`);
    }
  }
  for (const [from, to] of Object.entries(EXTRA_LEGACY)) {
    add(from, to);
  }

  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
}
