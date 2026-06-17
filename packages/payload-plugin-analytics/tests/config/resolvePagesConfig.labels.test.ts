// tests/config/resolvePagesConfig.labels.test.ts
import { describe, expect, it } from "vitest";
import { resolvePagesConfig } from "../../src/config/resolvePagesConfig";

describe("resolvePagesConfig — label options", () => {
  it("defaults titleField to 'title' per collection and resolvePagePath to undefined", () => {
    const r = resolvePagesConfig({ collections: ["pages", { slug: "posts" }] });
    expect(r?.collections).toEqual([
      { slug: "pages", publishedOnly: true, titleField: "title" },
      { slug: "posts", publishedOnly: true, titleField: "title" },
    ]);
    expect(r?.resolvePagePath).toBeUndefined();
  });

  it("carries an explicit titleField and resolvePagePath", () => {
    const fn = (ref: string) => `/x/${ref}`;
    const r = resolvePagesConfig({ collections: [{ slug: "posts", titleField: "name" }], resolvePagePath: fn });
    expect(r?.collections[0]).toEqual({ slug: "posts", publishedOnly: true, titleField: "name" });
    expect(r?.resolvePagePath).toBe(fn);
  });
});
