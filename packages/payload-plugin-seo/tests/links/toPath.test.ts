import { describe, expect, it } from "vitest";
import { siteOf, toPath } from "../../src/links/toPath";

describe("toPath", () => {
  it("strips origin, query, hash and the trailing slash", () => {
    expect(toPath("https://example.com/blog/post-a/?utm=1#top")).toBe("/blog/post-a");
  });

  it("keeps relative paths and the root", () => {
    expect(toPath("/es/about")).toBe("/es/about");
    expect(toPath("/")).toBe("/");
  });

  it("decodes percent-encoding", () => {
    expect(toPath("/caf%C3%A9")).toBe("/café");
  });

  it("returns null for non-http links", () => {
    expect(toPath("mailto:a@b.c")).toBeNull();
    expect(toPath("#section")).toBeNull();
  });

  it("returns null for malformed percent-encoding", () => {
    expect(toPath("/bad%E0%A4%A")).toBeNull();
  });
});

describe("siteOf", () => {
  it("returns the host of an absolute url", () => {
    expect(siteOf("https://Example.com:443/a?b=1")).toBe("example.com");
    expect(siteOf("//cdn.example.com/a")).toBe("cdn.example.com");
    expect(siteOf("https://example.com:8443/a")).toBe("example.com:8443");
  });

  it("treats http, https and the www. prefix as the same site", () => {
    expect(siteOf("http://www.example.com/a")).toBe(siteOf("https://example.com/b"));
  });

  it("returns null for relative and unparsable urls", () => {
    expect(siteOf("/a")).toBeNull();
    expect(siteOf("a/b")).toBeNull();
    expect(siteOf("")).toBeNull();
    expect(siteOf("http://[")).toBeNull();
  });
});
