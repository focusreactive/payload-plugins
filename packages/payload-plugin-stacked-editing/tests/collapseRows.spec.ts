import type { FormState } from "payload";
import { describe, expect, it } from "vitest";

import { rowsSignature, rowsToCollapse } from "../src/lib/collapseRows.js";

const state = (rows: Record<string, { id: string; collapsed?: boolean }[]>) =>
  Object.fromEntries([
    ["title", { value: "Home" }],
    ...Object.entries(rows).map(([path, r]) => [path, { rows: r, value: r.length }]),
  ]) as unknown as FormState;

const memory = (expanded: string[] = [], pending: string[] = []) => ({
  fieldsJustToggledByEditor: new Set(pending),
  rowsExpandedByEditor: new Set(expanded),
});

describe("rowsToCollapse", () => {
  it("collapses every row, nested ones included", () => {
    expect(
      rowsToCollapse(
        state({
          sections: [{ id: "a" }, { id: "b", collapsed: true }],
          "sections.0.items": [{ id: "c", collapsed: false }],
        }),
        memory()
      )
    ).toEqual([
      {
        path: "sections",
        updatedRows: [
          { id: "a", collapsed: true },
          { id: "b", collapsed: true },
        ],
      },
      { path: "sections.0.items", updatedRows: [{ id: "c", collapsed: true }] },
    ]);
  });

  it("keeps rows the editor expanded, collapses new rows and rows Payload re-expanded", () => {
    expect(
      rowsToCollapse(
        state({ sections: [{ id: "a", collapsed: false }, { id: "b" }, { id: "new" }] }),
        memory(["a"])
      )
    ).toEqual([
      {
        path: "sections",
        updatedRows: [
          { id: "a", collapsed: false },
          { id: "b", collapsed: true },
          { id: "new", collapsed: true },
        ],
      },
    ]);
  });

  it("takes a field the editor just toggled as their choice, once", () => {
    const m = memory(["b"], ["sections"]);
    const toggled = state({
      sections: [
        { id: "a", collapsed: false },
        { id: "b", collapsed: true },
      ],
    });
    expect(rowsToCollapse(toggled, m)).toEqual([]);
    expect([...m.rowsExpandedByEditor]).toEqual(["a"]);
    expect(m.fieldsJustToggledByEditor.size).toBe(0);
    expect(rowsToCollapse(toggled, m)).toEqual([]);
  });

  it("dispatches nothing when every row is already a card", () => {
    expect(rowsToCollapse(state({ sections: [{ id: "a", collapsed: true }] }), memory())).toEqual(
      []
    );
  });
});

describe("rowsSignature", () => {
  it("changes when rows are added or toggled, not when values change", () => {
    const a = rowsSignature(state({ sections: [{ id: "a", collapsed: true }] }));
    const typed = { ...state({ sections: [{ id: "a", collapsed: true }] }), title: { value: "X" } };
    expect(rowsSignature(typed as unknown as FormState)).toBe(a);
    expect(rowsSignature(state({ sections: [{ id: "a", collapsed: false }] }))).not.toBe(a);
    expect(
      rowsSignature(state({ sections: [{ id: "a", collapsed: true }, { id: "b" }] }))
    ).not.toBe(a);
  });
});
