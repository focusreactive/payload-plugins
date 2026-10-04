/**
 * CT content dump parser (plan §4). Pure functions, no Payload: the seed, the tests and the image
 * scraper's selection rule all build on this. Nothing client-specific is hard-coded — the company
 * name is derived from the Title tags at run time.
 */
import type {
  DumpEntry,
  ParsedChrome,
  ParsedPage,
  ParsedPost,
  ParsedSite,
  TemplateCode,
} from "./types";

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/** Templates that are not pages of the new site (rule 9). */
const IGNORED_TEMPLATES = new Set(["T-FRAGMENT", "T-LISTING", "T-ARCHIVE-INDEX"]);
const POST_TEMPLATES = new Set(["T-BLOG-POST", "T-NEWS-POST"]);

/** Rule 4: leaked site chrome — cut from the first matching line to the end of the entry. */
const CHROME_MARKERS = [
  /^#{2,6}\s+Get in touch to find out how .+ can help you/iu,
  /^#{2,6}\s+Other Content\b/iu,
  /^Certificate Number/iu,
  /^©\s*\S.*\bLtd\b/iu,
];

/** Rule 5: navigation sections on marketing pages (heading + the link-only list under it). */
const NAV_SECTION_MARKERS = [
  /^#{2,6}\s+Related articles\b/iu,
  /^#{2,6}\s+Our other services:?/iu,
  /^#{2,6}\s+.+\bBlog:\s*$/iu,
  /^Relevant articles:?\s*$/iu,
];

/** Rule 6: form stubs left by the scrape. */
const FORM_STUBS = [
  /^Learn more about our Privacy Policy here\s*\.?$/iu,
  /^By clicking submit\b/iu,
  /^Download white paper\s*$/iu,
  /^#{2,6}\s+Complete the form below\b/iu,
];

export function slugFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/\/+$/u, "");
  const last = path.split("/").filter(Boolean).at(-1) ?? "home";
  return last
    .toLowerCase()
    .replace(/\.html?$/u, "")
    .replaceAll(/[^a-z0-9-]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

export function legacyPathFromUrl(url: string): string {
  const path = new URL(url).pathname.toLowerCase().replace(/\/+$/u, "");
  return path || "/";
}

/** "Wed 08 January 2025" → "2025-01-08" (null when unparseable). */
export function parseDumpDate(text: string): string | null {
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/u.exec(text);
  if (!match) {
    return null;
  }
  const month = MONTHS.indexOf(match[2]!.toLowerCase());
  if (month === -1) {
    return null;
  }
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1]!.padStart(2, "0")}`;
}

/** Rule 7: does a long flattened line read as shell/code rather than prose? */
function looksLikeCode(line: string): boolean {
  const signals = [
    /\$\s/u,
    /&&/u,
    /\s--?[a-z]/u,
    /[{};]/u,
    /\/(usr|etc|bin|dev|opt)\//u,
    /\bsudo\b/u,
    /\.\//u,
    /[=]\S/u,
    /::/u,
    /\(\)/u,
  ];
  return signals.filter((re) => re.test(line)).length >= 3;
}

/** Inline code with a fence longer than any backtick run inside (CommonMark). */
function inlineCode(text: string): string {
  const longest = Math.max(0, ...[...text.matchAll(/`+/gu)].map((m) => m[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence} ${text.trim()} ${fence}`;
}

interface CleanResult {
  markdown: string;
  hasDownloadForm: boolean;
}

/** Rules 4–8 and 10 applied to one entry body. */
export function cleanBody(body: string, { isPage }: { isPage: boolean }): CleanResult {
  let lines = body.split("\n");

  // Rule 4: leaked chrome.
  const cut = lines.findIndex((line) => CHROME_MARKERS.some((re) => re.test(line.trim())));
  if (cut !== -1) {
    lines = lines.slice(0, cut);
  }

  // Rule 6: form stubs.
  let hasDownloadForm = false;
  lines = lines.filter((line) => {
    const isStub = FORM_STUBS.some((re) => re.test(line.trim()));
    hasDownloadForm ||= isStub;
    return !isStub;
  });

  // Rule 5: navigation sections (pages only).
  if (isPage) {
    const kept: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (NAV_SECTION_MARKERS.some((re) => re.test(lines[i]!.trim()))) {
        i++;
        while (i < lines.length && (/^\s*$/u.test(lines[i]!) || /^\s*[-*]\s/u.test(lines[i]!))) {
          i++;
        }
        i--;
        continue;
      }
      kept.push(lines[i]!);
    }
    lines = kept;
  }

  lines = lines.map((line) => {
    // Rule 7: flattened code — never a heading.
    if (line.startsWith("# ") || (line.length > 1500 && looksLikeCode(line))) {
      return inlineCode(line.replace(/^# /u, "# "));
    }
    // Rule 8: bodies start at ### → shift one level up (### → ##, #### → ###, ##### → ####).
    const heading = /^(#{3,6})\s+(.*)$/u.exec(line);
    if (heading) {
      return `${"#".repeat(heading[1]!.length - 1)} ${heading[2]}`;
    }
    return line;
  });

  // Rule 10: scrape artefacts.
  const markdown = lines
    .map((line) =>
      line.startsWith("`")
        ? line
        : line.replaceAll(/\s+([,.;:!?])(?=\s|$)/gu, "$1").replaceAll(/(\S) {2,}/gu, "$1 ")
    )
    .join("\n")
    .replaceAll(/\n{3,}/gu, "\n\n")
    .trim();

  return { hasDownloadForm, markdown };
}

interface RawEntry {
  number: string;
  title: string;
  meta: Record<string, string>;
  body: string;
  order: number;
}

/** Rules 1–2: split on `---` lines; metadata = the `**Key:** value` lines before the body. */
export function splitEntries(dump: string): RawEntry[] {
  const chunks = dump.split(/^---[ \t]*$/mu);
  const entries: RawEntry[] = [];

  for (const [order, chunk] of chunks.entries()) {
    const heading = /^##\s+(\d+\.\d+)\s+(.+)$/mu.exec(chunk);
    if (!heading || !/\*\*URL:\*\*/u.test(chunk)) {
      continue;
    }
    const after = chunk.slice(heading.index + heading[0].length).split("\n");
    const meta: Record<string, string> = {};
    let i = 0;
    for (; i < after.length; i++) {
      const line = after[i]!.trim();
      if (line === "") {
        continue;
      }
      const kv = /^\*\*([^*]+):\*\*\s*(.*)$/u.exec(line);
      if (!kv) {
        break;
      }
      meta[kv[1]!.trim()] = kv[2]!.trim();
    }
    entries.push({
      body: after.slice(i).join("\n"),
      meta,
      number: heading[1]!,
      order,
      title: heading[2]!.trim(),
    });
  }

  return entries;
}

function companyFromTitleTags(entries: RawEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const suffix = entry.meta["Title tag"]?.split(" | ").at(-1)?.trim();
    if (suffix && entry.meta["Title tag"]!.includes(" | ")) {
      counts.set(suffix, (counts.get(suffix) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export function parseChrome(dump: string): ParsedChrome {
  const section = /^# 1\.[^\n]*\n([\s\S]*?)(?=^# \d+\.)/mu.exec(dump)?.[1] ?? "";
  const emails = [...new Set(section.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu))];
  const phones = [
    ...new Set(
      (section.match(/\+?\d[\d ()-]{8,}\d/gu) ?? []).map((phone) =>
        phone.replaceAll(/\s+/gu, " ").trim()
      )
    ),
  ];
  const certificates = [
    ...section.matchAll(
      /(ISO\s*\d{4,5}(?::\d{4})?)[^\n]*?(?:Certificate Number[:\s]*([\w/-]+))?$/gmu
    ),
  ].map((m) => ({ certificate: m[2] ?? null, label: m[1]!.replaceAll(/\s+/gu, " ") }));
  const legalLine = /^.*©.*$/mu.exec(section)?.[0]?.trim() ?? null;
  return { certificates, emails, legalLine, phones, raw: section.trim() };
}

function escapeRegExp(text: string): string {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function stripTitleSuffix(titleTag: string | undefined, company: string | null): string | null {
  if (!titleTag) {
    return null;
  }
  return company
    ? titleTag.replace(new RegExp(`\\s*\\|\\s*${escapeRegExp(company)}\\s*$`, "u"), "")
    : titleTag;
}

export function parseDump(dump: string): ParsedSite {
  const raw = splitEntries(dump);
  const companyName = companyFromTitleTags(raw);
  const pages: ParsedPage[] = [];
  const posts: ParsedPost[] = [];
  const seen = new Map<string, string>();

  for (const entry of raw) {
    const url = entry.meta.URL;
    const template = /T-[A-Z-]+/u.exec(entry.meta.Template ?? "")?.[0] as TemplateCode | undefined;
    if (!url || !template || IGNORED_TEMPLATES.has(template)) {
      continue;
    }
    const isPost = POST_TEMPLATES.has(template);
    const slug = slugFromUrl(url);
    const owner = seen.get(slug);
    if (owner) {
      throw new Error(`Slug collision "${slug}": ${owner} and ${url}`);
    }
    seen.set(slug, url);

    const { markdown, hasDownloadForm } = cleanBody(entry.body, { isPage: !isPost });
    const base: DumpEntry = {
      hasDownloadForm,
      legacyPath: legacyPathFromUrl(url),
      markdown,
      number: entry.number,
      slug,
      template,
      title: entry.title,
      titleTag: stripTitleSuffix(entry.meta["Title tag"], companyName),
      url,
    };

    if (isPost) {
      const date = parseDumpDate(entry.meta.Date ?? "") ?? "1970-01-01";
      posts.push({
        ...base,
        author: entry.meta.Author?.trim() || companyName || "Unknown",
        date,
        order: entry.order,
        year: Number(date.slice(0, 4)),
      });
    } else {
      pages.push(base);
    }
  }

  return {
    authors: [...new Set(posts.map((post) => post.author))].sort(),
    chrome: parseChrome(dump),
    companyName,
    pages,
    posts,
  };
}

/**
 * Slugs are unique across pages and posts (lib/fields/slugField.ts). A post whose slug is taken by a
 * page of the new IA gets a suffix ("-news" for news, "-<year>" for articles); returns the renames.
 */
export function avoidPageSlugs(posts: ParsedPost[], pageSlugs: Set<string>): [string, string][] {
  const taken = new Set([...pageSlugs, ...posts.map((post) => post.slug)]);
  const renames: [string, string][] = [];
  for (const post of posts) {
    if (!pageSlugs.has(post.slug)) {
      continue;
    }
    const base = `${post.slug}-${post.template === "T-NEWS-POST" ? "news" : post.year}`;
    let slug = base;
    for (let n = 2; taken.has(slug); n++) {
      slug = `${base}-${n}`;
    }
    taken.add(slug);
    renames.push([post.slug, slug]);
    post.slug = slug;
  }
  return renames;
}

const byDateDesc = (a: ParsedPost, b: ParsedPost) =>
  b.date.localeCompare(a.date) || a.order - b.order;

/**
 * The demo selection (docs/plans/2026-10-04-ct-demo-content.md §1): every T-NEWS-POST plus the
 * `articles` newest T-BLOG-POST entries; `all` returns every post. Same rule as scrapeImages.ts.
 */
export function selectPosts(
  posts: ParsedPost[],
  { articles = 35, all = false }: { articles?: number; all?: boolean } = {}
): ParsedPost[] {
  if (all) {
    return [...posts].sort(byDateDesc);
  }
  const news = posts.filter((post) => post.template === "T-NEWS-POST").sort(byDateDesc);
  const blog = posts
    .filter((post) => post.template === "T-BLOG-POST")
    .sort(byDateDesc)
    .slice(0, articles);
  return [...news, ...blog];
}
