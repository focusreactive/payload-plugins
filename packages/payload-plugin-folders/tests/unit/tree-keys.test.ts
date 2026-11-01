import { describe, expect, it } from "vitest";

import {
  navigationFor,
  neighbourKeyOf,
  tabStopKeyOf,
  treeKeyActionOf,
} from "../../src/admin/Keyboard/treeKeys.js";
import type { KeyFacts, TreeKeyAction } from "../../src/admin/Keyboard/treeKeys.js";
import type { ItemRowModel } from "../../src/admin/Tree/useTreeData.js";
import { folderRow, pageRow } from "../helpers/treeItems.js";

const press = (key: string, modifiers: Partial<KeyFacts> = {}): TreeKeyAction | null =>
  treeKeyActionOf({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
  });

describe("the keys of spec section 7.6", () => {
  it("maps every row of the table to an action", () => {
    expect(press("ArrowUp")).toBe("focusPrevious");
    expect(press("ArrowDown")).toBe("focusNext");
    expect(press("ArrowRight")).toBe("expandOrFirstChild");
    expect(press("ArrowLeft")).toBe("collapseOrParent");
    expect(press("Home")).toBe("focusFirst");
    expect(press("End")).toBe("focusLast");
    expect(press("Enter")).toBe("activate");
    expect(press(" ")).toBe("toggleSelection");
    expect(press("ArrowUp", { shiftKey: true })).toBe("extendUp");
    expect(press("ArrowDown", { shiftKey: true })).toBe("extendDown");
    expect(press("a", { metaKey: true })).toBe("selectAll");
    expect(press("a", { ctrlKey: true })).toBe("selectAll");
    expect(press("ArrowUp", { altKey: true })).toBe("moveUp");
    expect(press("ArrowDown", { altKey: true })).toBe("moveDown");
    expect(press("ArrowLeft", { altKey: true })).toBe("moveOut");
    expect(press("ArrowRight", { altKey: true })).toBe("moveIn");
    expect(press("x", { metaKey: true })).toBe("cut");
    expect(press("v", { ctrlKey: true })).toBe("paste");
    expect(press("d", { metaKey: true })).toBe("duplicate");
    expect(press("z", { metaKey: true })).toBe("undo");
    expect(press("Delete")).toBe("delete");
    expect(press("Backspace")).toBe("delete");
    expect(press("Escape")).toBe("escape");
    expect(press("/")).toBe("focusSearch");
  });

  it("leaves Alt+Enter, F2 and the menu keys to the row, and M to Move mode", () => {
    expect(press("Enter", { altKey: true })).toBeNull();
    expect(press("F2")).toBeNull();
    expect(press("ContextMenu")).toBeNull();
    expect(press("F10", { shiftKey: true })).toBeNull();
    expect(press("m")).toBeNull();
  });

  it("means nothing for a press with a modifier the table does not name", () => {
    // Browser and system shortcuts keep working.
    expect(press("ArrowLeft", { metaKey: true })).toBeNull();
    expect(press("ArrowUp", { ctrlKey: true })).toBeNull();
    expect(press("z", { metaKey: true, shiftKey: true })).toBeNull();
    expect(press("a", { altKey: true, metaKey: true })).toBeNull();
    expect(press("ArrowDown", { altKey: true, shiftKey: true })).toBeNull();
    expect(press("Home", { shiftKey: true })).toBeNull();
    expect(press("/", { altKey: true })).toBeNull();
  });

  it("takes a slash that needs Shift on the layout", () => {
    expect(press("/", { shiftKey: true })).toBe("focusSearch");
  });
});

const itemRow = (
  item: ReturnType<typeof pageRow> | ReturnType<typeof folderRow>,
  overrides: Partial<ItemRowModel> = {}
): ItemRowModel => ({
  expandable: item.kind === "folder",
  expanded: false,
  item,
  key: `${item.collection}:${item.id}`,
  level: 0,
  parentKey: item.parentId === null ? "root" : String(item.parentId),
  posInSet: 1,
  setSize: 1,
  ...overrides,
});

const blog = folderRow(10, "Blog");
const first = pageRow(1, "First", 10);
const second = pageRow(2, "Second", 10);
const products = folderRow(11, "Products");

// Blog is open, with two pages in it; Products is closed.
const rows: ItemRowModel[] = [
  itemRow(blog, { expanded: true }),
  itemRow(first, { level: 1 }),
  itemRow(second, { level: 1 }),
  itemRow(products),
];

describe("navigating the rows", () => {
  it("steps to the neighbour and stops at the ends", () => {
    expect(navigationFor("focusNext", rows, "folders:10")).toEqual({
      key: "pages:1",
      type: "focus",
    });
    expect(navigationFor("focusPrevious", rows, "pages:1")).toEqual({
      key: "folders:10",
      type: "focus",
    });
    expect(navigationFor("focusPrevious", rows, "folders:10")).toEqual({
      key: "folders:10",
      type: "focus",
    });
    expect(navigationFor("focusNext", rows, "folders:11")).toEqual({
      key: "folders:11",
      type: "focus",
    });
  });

  it("goes to the first and last rows with Home and End", () => {
    expect(navigationFor("focusFirst", rows, "pages:2")).toEqual({
      key: "folders:10",
      type: "focus",
    });
    expect(navigationFor("focusLast", rows, "pages:1")).toEqual({
      key: "folders:11",
      type: "focus",
    });
  });

  it("opens a closed folder with Right, and enters an open one", () => {
    expect(navigationFor("expandOrFirstChild", rows, "folders:11")).toEqual({
      id: 11,
      type: "expand",
    });
    expect(navigationFor("expandOrFirstChild", rows, "folders:10")).toEqual({
      key: "pages:1",
      type: "focus",
    });
    // A page has nothing to open.
    expect(navigationFor("expandOrFirstChild", rows, "pages:1")).toBeNull();
  });

  it("goes up to the folder with Left, closing an open one first", () => {
    expect(navigationFor("collapseOrParent", rows, "folders:10")).toEqual({
      id: 10,
      type: "collapse",
    });
    expect(navigationFor("collapseOrParent", rows, "pages:2")).toEqual({
      key: "folders:10",
      type: "focus",
    });
    // A closed folder at the top has no parent row.
    expect(navigationFor("collapseOrParent", rows, "folders:11")).toBeNull();
  });

  it("starts at the first row when nothing is focused", () => {
    expect(navigationFor("focusNext", rows, null)).toEqual({ key: "folders:10", type: "focus" });
  });
});

describe("the row in the tab order", () => {
  it("is the one that last had the focus, else the first", () => {
    expect(tabStopKeyOf(rows, "pages:2")).toBe("pages:2");
    expect(tabStopKeyOf(rows, "pages:99")).toBe("folders:10");
    expect(tabStopKeyOf(rows, null)).toBe("folders:10");
    expect(tabStopKeyOf([], null)).toBeNull();
  });

  it("moves to the row that took the place of one that went away", () => {
    const before = rows.map((row) => row.key);
    const after = rows.filter((row) => row.key !== "pages:1");

    expect(neighbourKeyOf(after, before, "pages:1")).toBe("pages:2");
    // The last row going away leaves the new last row.
    expect(neighbourKeyOf(rows.slice(0, 3), before, "folders:11")).toBe("pages:2");
    expect(neighbourKeyOf([], before, "pages:1")).toBeNull();
  });
});
