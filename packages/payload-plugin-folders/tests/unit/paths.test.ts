import { describe, expect, it } from "vitest";

import {
  buildUrl,
  joinPath,
  normalizePath,
  parentPathOf,
  pathDepth,
  prefixesOf,
  splitPath,
  toStoryblokFullSlug,
} from "../../src/core/paths.js";

describe("normalizePath", () => {
  it("normalises /Blog/Post/ to /blog/post", () => {
    expect(normalizePath("/Blog/Post/")).toBe("/blog/post");
  });

  it("adds the leading slash, collapses repeats and keeps the root", () => {
    expect(normalizePath("blog//post")).toBe("/blog/post");
    expect(normalizePath("")).toBe("/");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("///")).toBe("/");
  });
});

describe("splitPath, joinPath, parentPathOf, pathDepth", () => {
  it("splits into segments and counts depth", () => {
    expect(splitPath("/a/b/c")).toEqual(["a", "b", "c"]);
    expect(splitPath("/")).toEqual([]);
    expect(pathDepth("/a/b/c")).toBe(3);
    expect(pathDepth("/")).toBe(0);
  });

  it("joins paths and bare segments", () => {
    expect(joinPath("/blog", "2026")).toBe("/blog/2026");
    expect(joinPath("", "about")).toBe("/about");
    expect(joinPath("/", "about")).toBe("/about");
    expect(joinPath()).toBe("/");
  });

  it("finds the parent, with no parent for the site root", () => {
    expect(parentPathOf("/a/b")).toBe("/a");
    expect(parentPathOf("/a")).toBe("/");
    expect(parentPathOf("/")).toBeNull();
  });
});

describe("prefixesOf", () => {
  it("prefixesOf /a/b/c is /a/b/c, /a/b, /a", () => {
    expect(prefixesOf("/a/b/c")).toEqual(["/a/b/c", "/a/b", "/a"]);
  });

  it("gives nothing for the site root", () => {
    expect(prefixesOf("/")).toEqual([]);
  });
});

describe("buildUrl", () => {
  it("buildUrl adds /de for non-default", () => {
    expect(buildUrl("/blog/team", "de", { defaultLocale: "en", localePrefix: "non-default" })).toBe(
      "/de/blog/team"
    );
    expect(buildUrl("/blog/team", "en", { defaultLocale: "en", localePrefix: "non-default" })).toBe(
      "/blog/team"
    );
  });

  it("throws when non-default has a locale but no defaultLocale", () => {
    expect(() => buildUrl("/blog", "de", { localePrefix: "non-default" })).toThrow(
      /defaultLocale/u
    );
    expect(() => buildUrl("/blog", "de")).toThrow(/defaultLocale/u);
    expect(buildUrl("/blog", null)).toBe("/blog");
    expect(buildUrl("/blog", "de", { localePrefix: "all" })).toBe("/de/blog");
  });

  it("supports all, none, no locale and the site root", () => {
    expect(buildUrl("/blog", "en", { defaultLocale: "en", localePrefix: "all" })).toBe("/en/blog");
    expect(buildUrl("/blog", "de", { defaultLocale: "en", localePrefix: "none" })).toBe("/blog");
    expect(buildUrl("/blog", null, { localePrefix: "all" })).toBe("/blog");
    expect(buildUrl("/", "de", { defaultLocale: "en" })).toBe("/de");
  });
});

describe("toStoryblokFullSlug", () => {
  it("toStoryblokFullSlug gives blog/ for a root page and an empty string for /", () => {
    expect(toStoryblokFullSlug("/blog", true)).toBe("blog/");
    expect(toStoryblokFullSlug("/", true)).toBe("");
    expect(toStoryblokFullSlug("/", false)).toBe("");
  });

  it("gives no trailing slash for an ordinary page", () => {
    expect(toStoryblokFullSlug("/blog/post", false)).toBe("blog/post");
  });
});
