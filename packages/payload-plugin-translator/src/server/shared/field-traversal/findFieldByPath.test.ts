import type { Field } from "payload";
import { describe, expect, it } from "vitest";

import { findFieldByPath } from "./findFieldByPath";

const f = (config: Record<string, unknown>): Field => config as unknown as Field;

const schema: Field[] = [
  f({ name: "title", type: "text" }),
  f({ name: "hero", type: "group", fields: [f({ name: "heading", type: "text" })] }),
  f({ name: "items", type: "array", fields: [f({ name: "label", type: "text" })] }),
  f({
    type: "tabs",
    tabs: [
      { name: "meta", fields: [f({ name: "slug", type: "text" })] },
      { label: "Main", fields: [f({ name: "intro", type: "text" })] },
    ],
  }),
  f({ type: "row", fields: [f({ name: "col", type: "text" })] }),
  f({ name: "layout", type: "blocks", blocks: [{ slug: "hero", fields: [f({ name: "headline", type: "text" })] }] }),
];

describe("findFieldByPath", () => {
  it("finds a top-level leaf and returns the field", () => {
    const result = findFieldByPath(schema, ["title"]);
    expect(result.status).toBe("leaf");
    if (result.status === "leaf") expect(result.field.name).toBe("title");
  });

  it("finds a leaf nested in a group", () => {
    expect(findFieldByPath(schema, ["hero", "heading"]).status).toBe("leaf");
  });

  it("finds a leaf inside an array (segments are name-only — indices dropped by the caller)", () => {
    expect(findFieldByPath(schema, ["items", "label"]).status).toBe("leaf");
  });

  it("finds a leaf under a named tab", () => {
    expect(findFieldByPath(schema, ["meta", "slug"]).status).toBe("leaf");
  });

  it("finds a leaf under an unnamed tab (transparent — same scope)", () => {
    expect(findFieldByPath(schema, ["intro"]).status).toBe("leaf");
  });

  it("finds a leaf inside a presentational row (transparent)", () => {
    expect(findFieldByPath(schema, ["col"]).status).toBe("leaf");
  });

  it("returns `container` when the path ends on a group / array", () => {
    expect(findFieldByPath(schema, ["hero"]).status).toBe("container");
    expect(findFieldByPath(schema, ["items"]).status).toBe("container");
  });

  it("returns `container` when the path ends on a named tab", () => {
    expect(findFieldByPath(schema, ["meta"]).status).toBe("container");
  });

  it("returns `container` when the path ends on a blocks field", () => {
    expect(findFieldByPath(schema, ["layout"]).status).toBe("container");
  });

  it("returns `inside-blocks` when the path descends through a blocks field", () => {
    expect(findFieldByPath(schema, ["layout", "headline"]).status).toBe("inside-blocks");
  });

  it("returns `not-found` for an unknown segment", () => {
    expect(findFieldByPath(schema, ["nope"]).status).toBe("not-found");
    expect(findFieldByPath(schema, ["hero", "missing"]).status).toBe("not-found");
  });

  it("returns `not-found` when the path continues past a leaf", () => {
    expect(findFieldByPath(schema, ["title", "deeper"]).status).toBe("not-found");
  });
});

describe("findFieldByPath — deeply nested schemas", () => {
  const deep: Field[] = [
    f({
      name: "a",
      type: "group",
      fields: [f({ name: "b", type: "group", fields: [f({ name: "c", type: "array", fields: [f({ name: "leaf", type: "text" })] })] })],
    }),
    f({ name: "arr", type: "array", fields: [f({ name: "g", type: "group", fields: [f({ name: "deep", type: "text" })] })] }),
    f({
      type: "tabs",
      tabs: [{ name: "tab1", fields: [f({ name: "tg", type: "group", fields: [f({ name: "tleaf", type: "text" })] })] }],
    }),
    f({ name: "withBlocks", type: "group", fields: [f({ name: "bl", type: "blocks", blocks: [{ slug: "x", fields: [f({ name: "y", type: "text" })] }] })] }),
  ];

  it("resolves a leaf through group → group → array (indices dropped)", () => {
    const r = findFieldByPath(deep, ["a", "b", "c", "leaf"]);
    expect(r.status).toBe("leaf");
    if (r.status === "leaf") expect(r.field.name).toBe("leaf");
  });

  it("resolves a leaf through array → group", () => {
    expect(findFieldByPath(deep, ["arr", "g", "deep"]).status).toBe("leaf");
  });

  it("resolves a leaf through a named tab → group", () => {
    expect(findFieldByPath(deep, ["tab1", "tg", "tleaf"]).status).toBe("leaf");
  });

  it("returns `inside-blocks` when a deep path descends through a nested blocks field", () => {
    expect(findFieldByPath(deep, ["withBlocks", "bl", "y"]).status).toBe("inside-blocks");
  });

  it("returns `container` for deep paths ending on a container at any depth", () => {
    expect(findFieldByPath(deep, ["a", "b"]).status).toBe("container"); // group
    expect(findFieldByPath(deep, ["a", "b", "c"]).status).toBe("container"); // array
    expect(findFieldByPath(deep, ["withBlocks", "bl"]).status).toBe("container"); // blocks
  });

  it("returns `not-found` for a wrong segment deep in the path, or a path past a deep leaf", () => {
    expect(findFieldByPath(deep, ["a", "b", "nope"]).status).toBe("not-found");
    expect(findFieldByPath(deep, ["a", "b", "c", "leaf", "extra"]).status).toBe("not-found");
  });

  it("returns `not-found` for empty segments", () => {
    expect(findFieldByPath(deep, []).status).toBe("not-found");
  });
});
