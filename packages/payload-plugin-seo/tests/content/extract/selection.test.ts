import { describe, expect, it } from "vitest";
import { makeExcluded, makeIncluded } from "../../../src/content/extract/selection";

describe("makeExcluded", () => {
  it("excludes metadata and user paths and their descendants", () => {
    const ex = makeExcluded(["meta.title", "slug"], ["sidebar"]);
    expect(ex("meta.title")).toBe(true);
    expect(ex("slug")).toBe(true);
    expect(ex("sidebar.related")).toBe(true);
    expect(ex("body")).toBe(false);
  });
});

describe("makeIncluded", () => {
  it("includes everything when empty", () => {
    const inc = makeIncluded([]);
    expect(inc("anything.0.x")).toBe(true);
  });
  it("keeps include paths, their ancestors, and descendants; normalizes array indices", () => {
    const inc = makeIncluded(["sections"]);
    expect(inc("sections")).toBe(true);
    expect(inc("sections.0.image")).toBe(true);
    expect(inc("other")).toBe(false);
  });
  it("keeps an ancestor of an include path, and normalizes indices in non-empty include mode", () => {
    const inc = makeIncluded(["sections.title"]);
    expect(inc("sections")).toBe(true); // ancestor of include path
    const inc2 = makeIncluded(["sections"]);
    expect(inc2("sections.0.title")).toBe(true); // descendant with numeric index normalized
    expect(inc2("meta.title")).toBe(false); // sibling mismatch
  });
});
