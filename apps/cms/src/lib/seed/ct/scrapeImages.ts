#!/usr/bin/env bun
/**
 * CT demo — image collector for the posts we migrate.
 *
 * The content dump has the article text but no image references, so this script re-visits the
 * selected posts on <client-domain>, extracts the images that sit inside the article body, downloads
 * them and writes a mapping the seed uses to put each image back after the right paragraph.
 *
 * Run from the repo root with Bun (no dependencies; uses Bun's built-in HTMLRewriter):
 *
 *   bun run apps/cms/src/lib/seed/ct/scrapeImages.ts --dump apps/cms/.local/ct/content-dump.md --out apps/cms/.local/ct
 *
 * Options:
 *   --dump <file>        the content dump; posts are selected by rule: every T-NEWS-POST entry plus the
 *                        35 newest T-BLOG-POST entries by date (same rule as the seed's selectPosts()).
 *                        Default: apps/cms/.local/ct/content-dump.md
 *   --articles <n>       how many newest articles to take (default 35); --all takes every post
 *   --selection <file>   explicit JSON array of { url } — overrides the rule
 *   --out <dir>          output root (default: apps/cms/.local/ct)
 *   --from-html          do not fetch; re-parse the HTML files saved under <out>/html by a previous run
 *   --no-download        parse and write the map, skip image downloads
 *   --delay <ms>         pause between page fetches (default 400 — be polite to the client's server)
 *   --limit <n>          only process the first n posts (for a dry run)
 *
 * Output:
 *   <out>/html/<slug>.html             raw page HTML (so the parse can be re-run offline)
 *   <out>/images/<slug>/<file>         downloaded images
 *   <out>/images-map.json              the mapping consumed by the seed (format: ImagesMap below)
 */

import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, extname, join } from "node:path";

// ───────────────────────────── types (mirrored by the seed) ─────────────────────────────

export interface MappedImage {
  /** Absolute URL the image was fetched from. */
  src: string;
  /** Path relative to <out>, e.g. "images/<slug>/figure-1.png". Null when the download failed. */
  local: string | null;
  alt: string;
  title: string | null;
  /**
   * Number of block-level elements (p, h2–h5, ul, ol, pre, blockquote, table) seen in the article
   * body before this image. The seed inserts the image after that many blocks of the Markdown body.
   */
  afterBlock: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
  sha1: string | null;
  /** How we found it: inline <img> in the body, the post splash background, or og:image. */
  kind: "inline" | "splash" | "og";
}

export interface MappedPost {
  slug: string;
  sourceUrl: string;
  status: "ok" | "fetch-failed" | "no-body";
  httpStatus: number | null;
  title: string | null;
  blockCount: number;
  images: MappedImage[];
}

export interface ImagesMap {
  generatedAt: string;
  source: string;
  posts: MappedPost[];
}

// ───────────────────────────── helpers ─────────────────────────────

const BLOCK_SELECTOR = ".post-content p, .post-content h2, .post-content h3, .post-content h4, .post-content h5, .post-content ul, .post-content ol, .post-content pre, .post-content blockquote, .post-content table";
const IMG_SELECTOR = ".post-content img";
const SPLASH_SELECTOR = ".post-splash, #splash";
const OG_SELECTOR = 'meta[property="og:image"]';

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : "true";
}
const has = (name: string) => process.argv.includes(`--${name}`);

/**
 * Minimal, dependency-free reader of the content dump: enough to select posts by template and date.
 * The full parser lives in parseDump.ts (seed); keep the selection rule identical in both places.
 */
export function selectPostsFromDump(markdown: string, articles = 35, all = false): { url: string; date: string; template: string }[] {
  const months = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const posts: { url: string; date: string; template: string; order: number }[] = [];
  for (const [order, entry] of markdown.split(/\n---\n/u).entries()) {
    const url = entry.match(/\*\*URL:\*\* (\S+)/u)?.[1];
    const template = entry.match(/\*\*Template:\*\* (T-[A-Z-]+)/u)?.[1];
    const dateText = entry.match(/\*\*Date:\*\* (.+)/u)?.[1]?.trim();
    if (!url || !template || !dateText) continue;
    // "Wed 08 January 2025" → 2025-01-08
    const m = dateText.match(/(\d{1,2}) ([A-Za-z]+) (\d{4})/u);
    const month = m ? months.indexOf(m[2].toLowerCase()) : -1;
    const date = m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : "0000-00-00";
    posts.push({ url, date, template, order });
  }
  const byDateDesc = (a: { date: string; order: number }, b: { date: string; order: number }) =>
    b.date.localeCompare(a.date) || a.order - b.order;
  if (all) return posts.sort(byDateDesc).map(({ url, date, template }) => ({ url, date, template }));
  const news = posts.filter((p) => p.template === "T-NEWS-POST").sort(byDateDesc);
  const blog = posts.filter((p) => p.template === "T-BLOG-POST").sort(byDateDesc).slice(0, articles);
  return [...news, ...blog].map(({ url, date, template }) => ({ url, date, template }));
}

/** Same rule as the dump parser: last path segment, lowercased, .html stripped, [a-z0-9-] only. */
export function slugFromUrl(url: string): string {
  const path = new URL(url).pathname.replace(/\/+$/u, "");
  const last = path.split("/").filter(Boolean).at(-1) ?? "home";
  return last
    .toLowerCase()
    .replace(/\.html?$/u, "")
    .replace(/[^a-z0-9-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function absolutize(src: string, pageUrl: string): string | null {
  try {
    return new URL(src.trim(), pageUrl).toString();
  } catch {
    return null;
  }
}

function toInt(v: string | null): number | null {
  if (!v) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function safeFileName(url: string, index: number): string {
  const raw = basename(new URL(url).pathname) || `image-${index}`;
  const ext = extname(raw).toLowerCase() || "";
  const stem = raw.slice(0, raw.length - ext.length).replace(/[^a-zA-Z0-9._-]+/gu, "-").slice(0, 80) || `image-${index}`;
  return `${String(index + 1).padStart(2, "0")}-${stem}${ext}`;
}

/** Parse one page's HTML. Pure function — used by the tests and by --from-html. */
export function parsePage(html: string, pageUrl: string): Omit<MappedPost, "status" | "httpStatus"> {
  let blockCount = 0;
  let title: string | null = null;
  const images: MappedImage[] = [];
  const seen = new Set<string>();

  const push = (img: Omit<MappedImage, "local" | "bytes" | "sha1">) => {
    if (seen.has(img.src)) return;
    seen.add(img.src);
    images.push({ ...img, local: null, bytes: null, sha1: null });
  };

  const rewriter = new HTMLRewriter()
    .on("title", {
      text(t) {
        title = `${title ?? ""}${t.text}`.trim() || null;
      },
    })
    .on(OG_SELECTOR, {
      element(el) {
        const src = absolutize(el.getAttribute("content") ?? "", pageUrl);
        if (src) push({ src, alt: "", title: null, afterBlock: 0, width: null, height: null, kind: "og" });
      },
    })
    .on(SPLASH_SELECTOR, {
      element(el) {
        const style = el.getAttribute("style") ?? "";
        const m = style.match(/url\((['"]?)([^'")]+)\1\)/u);
        const src = m ? absolutize(m[2], pageUrl) : null;
        if (src) push({ src, alt: "", title: null, afterBlock: 0, width: null, height: null, kind: "splash" });
      },
    })
    .on(BLOCK_SELECTOR, {
      element() {
        blockCount += 1;
      },
    })
    .on(IMG_SELECTOR, {
      element(el) {
        const raw = el.getAttribute("data-src") ?? el.getAttribute("src") ?? "";
        const src = absolutize(raw, pageUrl);
        if (!src || src.startsWith("data:")) return;
        push({
          src,
          alt: (el.getAttribute("alt") ?? "").trim(),
          title: el.getAttribute("title"),
          afterBlock: blockCount,
          width: toInt(el.getAttribute("width")),
          height: toInt(el.getAttribute("height")),
          kind: "inline",
        });
      },
    });

  // HTMLRewriter is streaming; transform + consume to run the handlers in document order.
  rewriter.transform(new Response(html)).text();

  return { slug: slugFromUrl(pageUrl), sourceUrl: pageUrl, title, blockCount, images };
}

async function fetchWithRetry(url: string, tries = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "FocusReactive-demo-migration/1.0 (+https://focusreactive.com)" },
        redirect: "follow",
      });
      if (res.ok || res.status === 404) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(500 * (i + 1));
  }
  throw lastError;
}

// ───────────────────────────── main ─────────────────────────────

async function main() {
  const selectionPath = arg("selection");
  const dumpPath = arg("dump", "apps/cms/.local/ct/content-dump.md")!;
  const articles = Number.parseInt(arg("articles", "35")!, 10);
  const out = arg("out", "apps/cms/.local/ct")!;
  const fromHtml = has("from-html");
  const download = !has("no-download");
  const delay = Number.parseInt(arg("delay", "400")!, 10);
  const limit = Number.parseInt(arg("limit", "0")!, 10);

  const selection: { url: string }[] = selectionPath
    ? JSON.parse(await readFile(selectionPath, "utf8"))
    : selectPostsFromDump(await readFile(dumpPath, "utf8"), articles, has("all"));
  const posts = limit > 0 ? selection.slice(0, limit) : selection;
  console.log(`selected ${selection.length} posts (${selectionPath ? `from ${selectionPath}` : `rule: news + ${has("all") ? "all" : articles} newest articles from ${dumpPath}`})`);

  await mkdir(join(out, "html"), { recursive: true });
  await mkdir(join(out, "images"), { recursive: true });

  const map: ImagesMap = { generatedAt: new Date().toISOString(), source: selectionPath ?? dumpPath, posts: [] };
  let downloaded = 0;
  let failed = 0;

  for (const [i, post] of posts.entries()) {
    const slug = slugFromUrl(post.url);
    const htmlPath = join(out, "html", `${slug}.html`);
    let html: string | null = null;
    let httpStatus: number | null = null;

    if (fromHtml) {
      html = await readFile(htmlPath, "utf8").catch(() => null);
    } else {
      try {
        const res = await fetchWithRetry(post.url);
        httpStatus = res.status;
        if (res.ok) {
          html = await res.text();
          await writeFile(htmlPath, html);
        }
      } catch (error) {
        console.error(`✗ ${post.url}: ${(error as Error).message}`);
      }
      if (delay > 0) await Bun.sleep(delay);
    }

    if (!html) {
      map.posts.push({ slug, sourceUrl: post.url, status: "fetch-failed", httpStatus, title: null, blockCount: 0, images: [] });
      failed += 1;
      continue;
    }

    const parsed = parsePage(html, post.url);
    const status: MappedPost["status"] = parsed.blockCount === 0 ? "no-body" : "ok";

    if (download) {
      await mkdir(join(out, "images", slug), { recursive: true });
      for (const [j, img] of parsed.images.entries()) {
        try {
          const res = await fetchWithRetry(img.src);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const bytes = new Uint8Array(await res.arrayBuffer());
          const file = safeFileName(img.src, j);
          const rel = join("images", slug, file);
          await writeFile(join(out, rel), bytes);
          img.local = rel;
          img.bytes = bytes.byteLength;
          img.sha1 = createHash("sha1").update(bytes).digest("hex");
          downloaded += 1;
        } catch (error) {
          console.error(`  ✗ image ${img.src}: ${(error as Error).message}`);
        }
      }
    }

    map.posts.push({ ...parsed, status, httpStatus });
    console.log(`${String(i + 1).padStart(3)}/${posts.length} ${status.padEnd(12)} ${slug}  blocks=${parsed.blockCount} images=${parsed.images.length}`);
  }

  await writeFile(join(out, "images-map.json"), JSON.stringify(map, null, 2));

  const inline = map.posts.reduce((n, p) => n + p.images.filter((im) => im.kind === "inline").length, 0);
  console.log(`\nposts: ${map.posts.length}  ok: ${map.posts.filter((p) => p.status === "ok").length}  failed: ${failed}`);
  console.log(`images: inline ${inline}, total ${map.posts.reduce((n, p) => n + p.images.length, 0)}, downloaded ${downloaded}`);
  console.log(`map: ${join(out, "images-map.json")}`);
  if (!fromHtml) {
    const saved = await readdir(join(out, "html"));
    console.log(`html saved: ${saved.length} files (re-parse offline with --from-html)`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
