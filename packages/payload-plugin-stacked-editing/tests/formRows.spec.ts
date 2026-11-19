import type { FormState } from "payload";
import { describe, expect, it } from "vitest";

import {
  blockTypeOf,
  keepFirstLevels,
  levelsWithUnchangedRows,
  openRowsSignature,
  rowCountOf,
  withRowCollapsed,
} from "../src/lib/formRows.js";
import type { RowLevel } from "../src/lib/resolveRowChain.js";

const fields = {
  layout: {
    rows: [
      { id: "a", blockType: "hero" },
      { id: "b", blockType: "cta" },
    ],
  },
  "layout.0.title": { value: "Welcome" },
  "layout.0.count": { value: 3 },
  "layout.0.items": { rows: [{ id: "c" }] },
  "layout.0.items.0.label": { value: "Deep" },
  "layout.1.blockType": { value: "fallback" },
} as unknown as FormState;

const level = (rowPath: string, fieldPath: string, rowIndex: number) =>
  ({ rowPath, fieldPath, rowIndex }) as unknown as RowLevel;

describe("form row helpers", () => {
  it("reads block types from the rows, falling back to the blockType field", () => {
    expect(blockTypeOf(fields, { fieldPath: "layout", rowIndex: 1, rowPath: "layout.1" })).toBe(
      "cta"
    );
    expect(blockTypeOf(fields, { fieldPath: "other", rowIndex: 1, rowPath: "layout.1" })).toBe(
      "fallback"
    );
    expect(rowCountOf(fields, "layout")).toBe(2);
  });

  it("collapses one row and leaves the others", () => {
    expect(withRowCollapsed([{ id: "a" }, { id: "b" }], "b")).toEqual([
      { id: "a" },
      { id: "b", collapsed: true },
    ]);
  });

  it("signs the rows and direct text values along the open path only", () => {
    const signature = openRowsSignature(fields, "layout.0.items.0");
    expect(signature).toContain("layout=a:hero,b:cta");
    expect(signature).toContain("layout.0.title=Welcome");
    expect(signature).toContain("layout.0.count=3");
    expect(signature).toContain("layout.0.items.0.label=Deep");
    expect(signature).not.toContain("layout.1.blockType");
    expect(openRowsSignature(fields, undefined)).toBe("");
  });

  it("keeps the levels whose rows are still the ones that were opened", () => {
    const chain = {
      complete: true,
      levels: [level("layout.0", "layout", 0), level("layout.0.items.0", "layout.0.items", 0)],
    };
    expect(
      levelsWithUnchangedRows(
        chain,
        { deepestRowPath: "layout.0.items.0", rowIdsAtOpen: ["a", "c"] },
        fields
      )
    ).toHaveLength(2);
    expect(
      levelsWithUnchangedRows(
        chain,
        { deepestRowPath: "layout.0.items.0", rowIdsAtOpen: ["a", "x"] },
        fields
      )
    ).toHaveLength(1);
  });

  it("keeps the first panels, or none", () => {
    const levels = [level("layout.0", "layout", 0), level("layout.0.items.0", "layout.0.items", 0)];
    const open = { deepestRowPath: "layout.0.items.0", rowIdsAtOpen: ["a", "c"] };
    expect(keepFirstLevels(levels, open, 1)).toEqual({
      deepestRowPath: "layout.0",
      rowIdsAtOpen: ["a"],
    });
    expect(keepFirstLevels(levels, open, 0)).toBeNull();
  });
});
