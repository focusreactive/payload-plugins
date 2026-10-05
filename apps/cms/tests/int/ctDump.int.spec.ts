import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildLegacyMap } from "@/lib/seed/ct/legacyMap";
import { insertImages, splitMarkdownBlocks } from "@/lib/seed/ct/markdownImages";
import {
  cleanBody,
  parseDump,
  parseDumpDate,
  selectPosts,
  slugFromUrl,
} from "@/lib/seed/ct/parseDump";

const fixture = readFileSync(path.resolve(__dirname, "fixtures/ct-dump.sample.md"), "utf-8");
const fullDumpPath = path.resolve(__dirname, "../../.local/ct/content-dump.md");

describe("CT dump parser — fixture", () => {
  const site = parseDump(fixture);

  it("splits pages and posts, ignores fragments, derives the company from Title tags", () => {
    expect(site.pages.map((page) => page.slug)).toEqual(["home", "automotive"]);
    expect(site.posts.map((post) => post.slug)).toEqual([
      "example-joins",
      "reproducible-builds",
      "boot-chains",
    ]);
    expect(site.companyName).toBe("Example");
    expect(site.pages[1]!.titleTag).toBe("Automotive");
  });

  it("reads post metadata", () => {
    const post = site.posts[1]!;
    expect(post.date).toBe("2025-01-08");
    expect(post.author).toBe("Jane Doe");
    expect(post.legacyPath).toBe("/articles/2025/reproducible-builds");
    expect(site.authors).toEqual(["Example", "Jane Doe", "John Roe"]);
  });

  it("strips leaked chrome, nav sections and form stubs (rules 4–6)", () => {
    const home = site.pages[0]!.markdown;
    expect(home).not.toMatch(/Get in touch/u);
    expect(home).not.toMatch(/Careers/u);
    const sector = site.pages[1]!;
    expect(sector.hasDownloadForm).toBe(true);
    expect(sector.markdown).not.toMatch(
      /Related articles|Post one|Certificate|By clicking|white paper/u
    );
    expect(sector.markdown).toMatch(/Functional safety/u);
  });

  it("shifts headings, keeps press boilerplate, normalises spacing (rules 8, 10)", () => {
    expect(site.pages[0]!.markdown).toMatch(/^## What we do$/mu);
    expect(site.pages[1]!.markdown).toMatch(/^### What is FuSa\?$/mu);
    expect(site.pages[0]!.markdown).toMatch(/trust, in the open\./u);
    expect(site.pages[1]!.markdown).toMatch(/need trustable/u);
    expect(site.posts[0]!.markdown).toMatch(/^## About Example$/mu);
  });

  it("turns flattened code lines into inline code, never a heading (rule 7)", () => {
    const body = site.posts[1]!.markdown;
    expect(body).toMatch(/^` # apt-get install build-essential `$/mu);
    expect(body).not.toMatch(/^# /mu);
    expect(body).toMatch(/\| Bazel \| Builds \|/u);
  });

  it("parses chrome contacts and certificates", () => {
    expect(site.chrome.emails).toEqual(["hello@example.com"]);
    expect(site.chrome.certificates.map((c) => c.label)).toEqual(["ISO 9001", "ISO 27001"]);
    expect(site.chrome.legalLine).toMatch(/^© Example Ltd/u);
  });

  it("selects news first, then the newest articles", () => {
    expect(selectPosts(site.posts, { articles: 1 }).map((post) => post.slug)).toEqual([
      "example-joins",
      "reproducible-builds",
    ]);
    expect(selectPosts(site.posts, { all: true })).toHaveLength(3);
  });

  it("helpers", () => {
    expect(slugFromUrl("https://x.test/articles/2019/RISC-V-user-space-access-oops.html")).toBe(
      "risc-v-user-space-access-oops"
    );
    expect(parseDumpDate("Wed 08 January 2025")).toBe("2025-01-08");
    expect(
      cleanBody("text\n\n© Example Ltd 2026\n- Privacy Policy", { isPage: true }).markdown
    ).toBe("text");
  });
});

describe("CT image insertion", () => {
  const site = parseDump(fixture);
  const body = site.posts[2]!.markdown;
  const images = [
    { afterBlock: 0, alt: "Cover", url: "/media/a.png" },
    { afterBlock: 2, alt: "Diagram", url: "/media/b.png", title: "Figure 1" },
    { afterBlock: 99, alt: "Last", url: "/media/c.png" },
  ];

  it("counts blocks like the scraper (paragraph, heading, whole list)", () => {
    expect(splitMarkdownBlocks(body)).toHaveLength(5);
  });

  it("inserts 3 images at the mapped block positions", () => {
    const { markdown, proportional } = insertImages(body, images, 5);
    expect(proportional).toBe(false);
    const blocks = splitMarkdownBlocks(markdown);
    expect(blocks[0]).toBe("![Cover](/media/a.png)");
    expect(blocks[3]).toBe('![Diagram](/media/b.png "Figure 1")');
    expect(blocks.at(-1)).toBe("![Last](/media/c.png)");
    expect(markdown.match(/!\[/gu)).toHaveLength(3);
  });

  it("falls back to proportional positions when the block counts disagree", () => {
    const { proportional } = insertImages(body, images, 20);
    expect(proportional).toBe(true);
  });
});

describe.skipIf(!existsSync(fullDumpPath))("CT dump parser — full dump (plan §4 counts)", () => {
  const dump = existsSync(fullDumpPath) ? readFileSync(fullDumpPath, "utf-8") : "";
  const site = existsSync(fullDumpPath) ? parseDump(dump) : null;

  it("has 237 entries with a URL", () => {
    expect(dump.match(/^\*\*URL:\*\*/gmu)).toHaveLength(237);
  });

  it("has 191 posts with date and author, 69 authors, years 2014–2026", () => {
    expect(site!.posts).toHaveLength(191);
    expect(site!.authors).toHaveLength(69);
    const years = site!.posts.map((post) => post.year);
    expect(Math.min(...years)).toBe(2014);
    expect(Math.max(...years)).toBe(2026);
  });

  it("selects 40 posts by default (5 news + 35 articles, 19 authors)", () => {
    const selected = selectPosts(site!.posts);
    expect(selected).toHaveLength(40);
    expect(selected.filter((post) => post.template === "T-NEWS-POST")).toHaveLength(5);
    expect(new Set(selected.map((post) => post.author)).size).toBe(19);
  });

  it("covers the four article URL shapes", () => {
    const shapes = { articleSlash: 0, articleHtml: 0, articleNoYear: 0, news: 0 };
    for (const post of site!.posts) {
      const p = new URL(post.url).pathname;
      if (/^\/articles\/\d{4}\/[^/]+\/$/u.test(p)) shapes.articleSlash++;
      else if (/^\/articles\/\d{4}\/[^/]+\.html$/u.test(p)) shapes.articleHtml++;
      else if (/^\/articles\/[^/]+\/?$/u.test(p)) shapes.articleNoYear++;
      else if (/^\/news\/[^/]+\.html$/u.test(p)) shapes.news++;
    }
    // Plan §4 says 159/19; the dump has 158/20 (two no-year URLs lack the trailing slash). Total 191.
    expect(shapes).toEqual({ articleSlash: 158, articleHtml: 8, articleNoYear: 20, news: 5 });
  });

  it("never emits a top-level heading from flattened code", () => {
    for (const post of site!.posts) {
      expect(post.markdown).not.toMatch(/^# /mu);
    }
  });
});

describe("CT legacy URL map", () => {
  const site = parseDump(fixture);
  const map = buildLegacyMap(site.pages, site.posts);

  it("maps marketing pages (with and without .html) via their dump entry", () => {
    expect(map["/automotive.html"]).toBe("/sectors/automotive");
    expect(map["/automotive"]).toBe("/sectors/automotive");
  });

  it("keeps a post on its old address and maps the other shapes there", () => {
    expect(map["/articles/2025/reproducible-builds"]).toBeUndefined();
    expect(map["/articles/2025/reproducible-builds.html"]).toBe(
      "/articles/2025/reproducible-builds"
    );
    expect(map["/articles/reproducible-builds"]).toBe("/articles/2025/reproducible-builds");
  });

  it("leaves news and author pages alone: they keep their old addresses", () => {
    expect(map["/news/example-joins.html"]).toBeUndefined();
    expect(map["/author/jane-doe.html"]).toBeUndefined();
  });

  it("never shadows a page of the new site or emits the home page", () => {
    expect(Object.keys(map)).not.toContain("/.html");
    expect(Object.keys(map)).not.toContain("/contact");
    expect(map["/index.html"]).toBe("/");
  });
});
