import { describe, expect, it } from "vitest";
import { originOf, toPath } from "../../src/links/toPath";

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

describe("originOf", () => {
  it("returns the origin of an absolute url", () => {
    expect(originOf("https://Example.com:443/a?b=1")).toBe("https://example.com");
    expect(originOf("//cdn.example.com/a")).toBe("http://cdn.example.com");
  });

  it("returns null for relative and unparsable urls", () => {
    expect(originOf("/a")).toBeNull();
    expect(originOf("a/b")).toBeNull();
    expect(originOf("")).toBeNull();
    expect(originOf("http://[")).toBeNull();
  });
});
