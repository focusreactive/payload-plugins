import { describe, expect, it } from "vitest";

import {
  MAX_SEGMENT_LENGTH,
  SEGMENT_PATTERN,
  isValidSegment,
  slugify,
} from "../../src/core/slugify.js";

describe("slugify", () => {
  it("Blog Ünïcode & Co becomes blog-uenicode-co", () => {
    expect(slugify("Blog Ünïcode & Co")).toBe("blog-uenicode-co");
  });

  it("cuts at 96 characters", () => {
    const slug = slugify("a".repeat(150));

    expect(slug).toHaveLength(MAX_SEGMENT_LENGTH);
    expect(slugify(`${"a".repeat(95)} b`)).toBe("a".repeat(95));
  });

  it("transliterates the German letters before stripping marks", () => {
    expect(slugify("Größe für Änderungen, schön")).toBe("groesse-fuer-aenderungen-schoen");
    expect(slugify("Crème brûlée")).toBe("creme-brulee");
  });

  it("collapses runs of other characters and trims the ends", () => {
    expect(slugify("  --Hello,   World!!  ")).toBe("hello-world");
    expect(slugify("???")).toBe("");
  });

  it("produces output that passes the segment pattern", () => {
    expect(SEGMENT_PATTERN.test(slugify("Summer Sale 2026"))).toBe(true);
  });
});

describe("isValidSegment", () => {
  it("accepts about_us and index.html below the root", () => {
    expect(isValidSegment("about_us", { atSiteRoot: false })).toBe(true);
    expect(isValidSegment("index.html", { atSiteRoot: false })).toBe(true);
    expect(isValidSegment("about_us", { atSiteRoot: true })).toBe(true);
  });

  it("refuses a dot at the site root", () => {
    expect(isValidSegment("robots.txt", { atSiteRoot: true })).toBe(false);
    expect(isValidSegment("favicon.ico", { atSiteRoot: true })).toBe(false);
  });

  it("refuses a slash", () => {
    expect(isValidSegment("blog/post", { atSiteRoot: false })).toBe(false);
  });

  it("refuses empty, over-long, uppercase and badly joined segments", () => {
    expect(isValidSegment("", { atSiteRoot: false })).toBe(false);
    expect(isValidSegment("a".repeat(97), { atSiteRoot: false })).toBe(false);
    expect(isValidSegment("a".repeat(96), { atSiteRoot: false })).toBe(true);
    expect(isValidSegment("Blog", { atSiteRoot: false })).toBe(false);
    expect(isValidSegment("-blog", { atSiteRoot: false })).toBe(false);
    expect(isValidSegment("blog-", { atSiteRoot: false })).toBe(false);
    expect(isValidSegment("a--b", { atSiteRoot: false })).toBe(false);
  });
});
