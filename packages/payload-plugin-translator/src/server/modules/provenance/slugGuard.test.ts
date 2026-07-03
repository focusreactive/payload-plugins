import { describe, it, expect } from "vitest";
import { assertProvenanceSlugFree } from "./slugGuard";

describe("assertProvenanceSlugFree", () => {
  it("passes when the slug is not used by any collection", () => {
    expect(() =>
      assertProvenanceSlugFree("translator-provenance", [{ slug: "posts" }, { slug: "pages" }])
    ).not.toThrow();
  });

  it("throws a clear error when the slug collides", () => {
    expect(() => assertProvenanceSlugFree("posts", [{ slug: "posts" }, { slug: "pages" }])).toThrow(
      /posts/u
    );
  });

  it("tolerates an empty collection list", () => {
    expect(() => assertProvenanceSlugFree("translator-provenance", [])).not.toThrow();
  });
});
