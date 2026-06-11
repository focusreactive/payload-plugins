import { describe, it, expect } from "vitest";
import type { Field } from "payload";

import { resolveFieldSubtree } from "./resolveFieldSubtree";

// Minimal field configs cast to Field — enough for payload/shared predicates,
// which key on `type` / `name` / `fields` / `tabs`.
const f = (config: Record<string, unknown>): Field => config as unknown as Field;

const schema: Field[] = [
  f({ name: "title", type: "text", localized: true }),
  f({ name: "count", type: "number" }),
  f({ name: "hero", type: "group", fields: [f({ name: "heading", type: "text", localized: true })] }),
  f({ name: "items", type: "array", fields: [f({ name: "label", type: "text", localized: true })] }),
  f({
    type: "tabs",
    tabs: [
      { name: "meta", fields: [f({ name: "slug", type: "text", localized: true })] },
      { label: "Main", fields: [f({ name: "intro", type: "textarea", localized: true })] },
    ],
  }),
  f({ type: "row", fields: [f({ name: "col", type: "text", localized: true })] }),
  f({ name: "layout", type: "blocks", blocks: [{ slug: "hero", fields: [f({ name: "headline", type: "text", localized: true })] }] }),
];

describe("resolveFieldSubtree", () => {
  it("resolves a top-level leaf, rooting the value under its name", () => {
    const result = resolveFieldSubtree(schema, "title", "Hello");
    expect(result).toEqual({
      status: "resolved",
      schema: [schema[0]],
      sourceData: { title: "Hello" },
      fieldName: "title",
    });
  });

  it("resolves a leaf nested in a group", () => {
    const result = resolveFieldSubtree(schema, "hero.heading", "Hi");
    expect(result.status).toBe("resolved");
    if (result.status === "resolved") {
      expect(result.fieldName).toBe("heading");
      expect(result.sourceData).toEqual({ heading: "Hi" });
    }
  });

  it("resolves through an array, dropping the numeric index", () => {
    const byIndex = resolveFieldSubtree(schema, "items.0.label", "A");
    const byName = resolveFieldSubtree(schema, "items.label", "A");
    expect(byIndex.status).toBe("resolved");
    expect(byName).toEqual(byIndex);
    if (byIndex.status === "resolved") expect(byIndex.fieldName).toBe("label");
  });

  it("resolves a leaf under a named tab (tab name is a segment)", () => {
    const result = resolveFieldSubtree(schema, "meta.slug", "x");
    expect(result.status).toBe("resolved");
  });

  it("resolves a leaf under an unnamed tab (transparent, no segment)", () => {
    const result = resolveFieldSubtree(schema, "intro", "x");
    expect(result.status).toBe("resolved");
  });

  it("resolves a leaf inside a presentational row (transparent)", () => {
    const result = resolveFieldSubtree(schema, "col", "x");
    expect(result.status).toBe("resolved");
  });

  it("returns not-found for a path that matches no field (typo)", () => {
    expect(resolveFieldSubtree(schema, "nope", "x").status).toBe("not-found");
    expect(resolveFieldSubtree(schema, "hero.missing", "x").status).toBe("not-found");
    expect(resolveFieldSubtree(schema, "", "x").status).toBe("not-found");
  });

  it("returns not-translatable for a non-text leaf", () => {
    expect(resolveFieldSubtree(schema, "count", 5).status).toBe("not-translatable");
  });

  it("returns not-translatable when the path ends at a container (named tab)", () => {
    expect(resolveFieldSubtree(schema, "meta", {}).status).toBe("not-translatable");
  });

  it("returns inside-blocks when the path descends through a blocks field", () => {
    expect(resolveFieldSubtree(schema, "layout.0.headline", "x").status).toBe("inside-blocks");
  });

  it("returns not-found when the path continues past a leaf", () => {
    expect(resolveFieldSubtree(schema, "title.deeper", "x").status).toBe("not-found");
  });

  describe("path normalization", () => {
    it("trims whitespace around segments", () => {
      const result = resolveFieldSubtree(schema, " hero . heading ", "Hi");
      expect(result.status).toBe("resolved");
      if (result.status === "resolved") expect(result.fieldName).toBe("heading");
    });

    it("drops empty segments from consecutive, leading, and trailing dots", () => {
      expect(resolveFieldSubtree(schema, "hero..heading", "Hi").status).toBe("resolved");
      expect(resolveFieldSubtree(schema, ".title.", "Hello")).toEqual({
        status: "resolved",
        schema: [schema[0]],
        sourceData: { title: "Hello" },
        fieldName: "title",
      });
    });

    it("returns not-found when a path normalizes to nothing (only index / only whitespace)", () => {
      expect(resolveFieldSubtree(schema, "0", "x").status).toBe("not-found");
      expect(resolveFieldSubtree(schema, "   ", "x").status).toBe("not-found");
    });
  });

  it("resolves a leaf through group > array (drops the index mid-path)", () => {
    const cell = f({ name: "cell", type: "text", localized: true });
    const nested: Field[] = [f({ name: "sect", type: "group", fields: [f({ name: "rows", type: "array", fields: [cell] })] })];
    const byIndex = resolveFieldSubtree(nested, "sect.rows.0.cell", "A");
    const byName = resolveFieldSubtree(nested, "sect.rows.cell", "A");
    expect(byName).toEqual(byIndex);
    expect(byIndex).toEqual({
      status: "resolved",
      schema: [cell],
      sourceData: { cell: "A" },
      fieldName: "cell",
    });
  });

  it("returns not-translatable for any container at the path end (group / array / blocks)", () => {
    expect(resolveFieldSubtree(schema, "hero", {}).status).toBe("not-translatable"); // group
    expect(resolveFieldSubtree(schema, "items", []).status).toBe("not-translatable"); // array
    expect(resolveFieldSubtree(schema, "layout", []).status).toBe("not-translatable"); // blocks
  });
});
