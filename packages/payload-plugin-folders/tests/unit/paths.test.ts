import { describe, expect, it } from "vitest";

import {
  buildUrl,
  formatPath,
  joinPath,
  normalizePath,
  parentPathOf,
  pathDepth,
  prefixesOf,
  splitPath,
  toStoryblokFullSlug,
  withoutTrailingSlash,
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

describe("buildUrl with trailingSlash", () => {
  const withSlash = { defaultLocale: "en", trailingSlash: true } as const;

  it("ends every path in a slash but the root of the default locale", () => {
    expect(buildUrl("/", "de", withSlash)).toBe("/de/");
    expect(buildUrl("/", "en", { ...withSlash, localePrefix: "all" })).toBe("/en/");
    expect(buildUrl("/", "en", { ...withSlash, localePrefix: "none" })).toBe("/");
    expect(buildUrl("/blog", "de", withSlash)).toBe("/de/blog/");
    expect(buildUrl("/blog/team/", null, { trailingSlash: true })).toBe("/blog/team/");
  });

  it("gives a file-like last segment no slash", () => {
    expect(buildUrl("/f/feed.xml", "de", withSlash)).toBe("/de/f/feed.xml");
  });

  it("answers with no slash by default and when false", () => {
    expect(buildUrl("/blog/", "de", { defaultLocale: "en" })).toBe("/de/blog");
    expect(buildUrl("/", "de", { defaultLocale: "en", trailingSlash: false })).toBe("/de");
  });
});

describe("withoutTrailingSlash", () => {
  it("strips the slashes at the end, keeps case and keeps the root", () => {
    expect(withoutTrailingSlash("/a/B/")).toBe("/a/B");
    expect(withoutTrailingSlash("/a//")).toBe("/a");
    expect(withoutTrailingSlash("/a")).toBe("/a");
    expect(withoutTrailingSlash("/")).toBe("/");
    expect(withoutTrailingSlash("//")).toBe("/");
    expect(withoutTrailingSlash("")).toBe("");
  });
});

describe("formatPath", () => {
  it("never changes the root", () => {
    expect(formatPath("/", true)).toBe("/");
    expect(formatPath("/", false)).toBe("/");
  });

  it("adds the slash with true and removes it with false", () => {
    expect(formatPath("/a/b", true)).toBe("/a/b/");
    expect(formatPath("/a/b/", true)).toBe("/a/b/");
    expect(formatPath("/a/b", false)).toBe("/a/b");
    expect(formatPath("/a/b/", false)).toBe("/a/b");
  });

  it("is idempotent", () => {
    for (const trailingSlash of [true, false]) {
      for (const path of ["/", "/a", "/a/b/", "/a/feed.xml", "/.well-known/x", "/a/v1.2-beta"]) {
        const once = formatPath(path, trailingSlash);

        expect(formatPath(once, trailingSlash)).toBe(once);
      }
    }
  });

  it("follows Next.js: a file-like last segment and .well-known get no slash", () => {
    expect(formatPath("/a/feed.xml", true)).toBe("/a/feed.xml");
    expect(formatPath("/a/feed.xml/", true)).toBe("/a/feed.xml");
    expect(formatPath("/.well-known/x", true)).toBe("/.well-known/x");
    expect(formatPath("/.well-known", true)).toBe("/.well-known");
    expect(formatPath("/a/v1.2-beta", true)).toBe("/a/v1.2-beta/");
  });

  it("keeps case, and keeps an empty path empty", () => {
    expect(formatPath("/a/About", true)).toBe("/a/About/");
    expect(formatPath("", true)).toBe("");
    expect(formatPath("", false)).toBe("");
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
