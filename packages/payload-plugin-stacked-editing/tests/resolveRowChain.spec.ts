import { describe, expect, it } from "vitest";

import { blockRowPermissions, resolveRowChain } from "../src/lib/resolveRowChain.js";
import { blocksMap, documentFields, getBlockType } from "./fixtures.js";

const resolve = (rowPath: string, extra: Partial<Parameters<typeof resolveRowChain>[0]> = {}) =>
  resolveRowChain({
    blocksMap,
    fields: documentFields,
    getBlockType,
    permissions: true,
    rowPath,
    ...extra,
  });

const summary = (rowPath: string) =>
  resolve(rowPath).levels.map((level) => ({
    rowPath: level.rowPath,
    fieldPath: level.fieldPath,
    block: level.block?.slug,
    schemaPath: level.schemaPath,
  }));

describe("resolveRowChain", () => {
  it("resolves a top-level block row", () => {
    const chain = resolve("layout.0");
    expect(chain.complete).toBe(true);
    expect(chain.levels).toHaveLength(1);
    expect(chain.levels[0]?.block?.slug).toBe("deepNest");
    // Payload's Blocks field: `schemaPath + blockConfig.slug`.
    expect(chain.levels[0]?.schemaPath).toBe("layoutdeepNest");
  });

  it("walks blocks inside blocks inside blocks, one level per row", () => {
    expect(summary("layout.0.nested.1.leaves.0")).toEqual([
      { rowPath: "layout.0", fieldPath: "layout", block: "deepNest", schemaPath: "layoutdeepNest" },
      {
        rowPath: "layout.0.nested.1",
        fieldPath: "layout.0.nested",
        block: "inner",
        schemaPath: "layoutdeepNest.nestedinner",
      },
      {
        rowPath: "layout.0.nested.1.leaves.0",
        fieldPath: "layout.0.nested.1.leaves",
        block: "leaf",
        schemaPath: "layoutdeepNest.nestedinner.leavesleaf",
      },
    ]);
  });

  it("sees through row, collapsible and unnamed tabs; descends named groups and tabs", () => {
    expect(summary("layout.0.panel.chips.3").at(-1)).toEqual({
      rowPath: "layout.0.panel.chips.3",
      fieldPath: "layout.0.panel.chips",
      block: undefined,
      schemaPath: "layoutdeepNest.panel.chips",
    });
    expect(summary("layout.0.meta.links.0").at(-1)).toEqual({
      rowPath: "layout.0.meta.links.0",
      fieldPath: "layout.0.meta.links",
      block: undefined,
      // The tabs field is unnamed, so it contributes an `_index-` segment to the schema path only.
      schemaPath: "layoutdeepNest._index-1.meta.links",
    });
    expect(summary("layout.0.items.2").at(-1)?.schemaPath).toBe("layoutdeepNest._index-1-1.items");
  });

  it("resolves blocks referenced by slug through the config-level blocks map", () => {
    const chain = resolve("layout.0.items.2.callouts.0");
    expect(chain.complete).toBe(true);
    expect(chain.levels.map((level) => level.rowPath)).toEqual([
      "layout.0",
      "layout.0.items.2",
      "layout.0.items.2.callouts.0",
    ]);
    expect(chain.levels.at(-1)?.block?.slug).toBe("callout");
  });

  it("returns the rows it could resolve when a block type is unknown", () => {
    const chain = resolve("layout.0.nested.7.leaves.0");
    expect(chain.complete).toBe(false);
    expect(chain.levels.map((level) => level.rowPath)).toEqual(["layout.0"]);
  });

  it("does not resolve paths outside any array or blocks field", () => {
    expect(resolve("title.0").complete).toBe(false);
    expect(resolve("layout.x").complete).toBe(false);
    expect(resolve("layout.0.panel.heading.0").complete).toBe(false);
  });

  it("passes row permissions down the way BlockRow / ArrayRow do", () => {
    const permissions = {
      title: { create: true, read: true, update: true },
      layout: {
        create: true,
        read: true,
        update: true,
        blocks: {
          deepNest: {
            fields: {
              nested: { create: true, read: true, update: false, blocks: { inner: true } },
            },
          },
        },
      },
    };
    const chain = resolve("layout.0.nested.1", { permissions: permissions as never });
    expect(chain.levels[0]?.permissions).toEqual(permissions.layout.blocks.deepNest.fields);
    expect(chain.levels[0]?.readOnly).toBe(false);
    expect(chain.levels[1]?.permissions).toBe(true);
    // No update permission on `nested` → its rows render read-only.
    expect(chain.levels[1]?.readOnly).toBe(true);
  });

  it("carries a read-only document into every level", () => {
    const chain = resolve("layout.0.nested.1", { readOnly: true });
    expect(chain.levels.every((level) => level.readOnly)).toBe(true);
  });
});

describe("blockRowPermissions", () => {
  it("mirrors BlockRow", () => {
    expect(blockRowPermissions(true, "hero")).toBe(true);
    expect(blockRowPermissions({ blocks: { hero: true } }, "hero")).toBe(true);
    expect(blockRowPermissions({ blocks: { hero: { fields: { a: true } } } }, "hero")).toEqual({
      a: true,
    });
    expect(blockRowPermissions({ read: true }, "hero")).toEqual({ read: true });
    expect(blockRowPermissions(undefined, "hero")).toBeUndefined();
  });
});
