import { describe, expect, it } from "vitest";

import { siblingMoveOf } from "../../src/admin/ContextMenu/siblingMove.js";
import { buildMoveBody } from "../../src/admin/Move/moveFlow.js";
import { pageRow } from "../helpers/treeItems.js";

const first = pageRow(1, "First", 5, { orderKey: "a0" });
const second = pageRow(2, "Second", 5, { orderKey: "a1" });
const third = pageRow(3, "Third", 5, { orderKey: "a2" });
const siblings = [first, second, third];

describe("siblingMoveOf", () => {
  it("moves the second row up to the top of its folder", () => {
    const move = siblingMoveOf(second, siblings, false, "up");

    expect(move.blocked).toBeNull();
    expect(move.target).toEqual({ position: "start", toFolder: 5 });
    expect(buildMoveBody([second], move.target as never)).toEqual({
      items: [{ collection: "pages", expected: { orderKey: "a1", parentId: 5 }, id: 2 }],
      position: "start",
      toFolder: 5,
    });
  });

  it("moves the third row up to after the first, naming the folder it saw the first in", () => {
    const move = siblingMoveOf(third, siblings, false, "up");

    expect(buildMoveBody([third], move.target as never)).toEqual({
      after: { collection: "pages", expected: { parentId: 5 }, id: 1 },
      items: [{ collection: "pages", expected: { orderKey: "a2", parentId: 5 }, id: 3 }],
    });
  });

  it("moves the first row down to after the second", () => {
    const move = siblingMoveOf(first, siblings, false, "down");

    expect(buildMoveBody([first], move.target as never)).toEqual({
      after: { collection: "pages", expected: { parentId: 5 }, id: 2 },
      items: [{ collection: "pages", expected: { orderKey: "a0", parentId: 5 }, id: 1 }],
    });
  });

  it("sends no request at the top: the first row cannot go up", () => {
    expect(siblingMoveOf(first, siblings, false, "up")).toEqual({ blocked: "first", target: null });
  });

  it("sends no request at the bottom: the last row cannot go down", () => {
    expect(siblingMoveOf(third, siblings, false, "down")).toEqual({
      blocked: "last",
      target: null,
    });
  });

  it("waits for the rest of the folder when the next row is not loaded yet", () => {
    expect(siblingMoveOf(third, siblings, true, "down")).toEqual({
      blocked: "unloaded",
      target: null,
    });
  });

  it("reports a row that is not among the loaded siblings as not loaded", () => {
    expect(siblingMoveOf(pageRow(9, "Elsewhere", 5), siblings, false, "up")).toEqual({
      blocked: "unloaded",
      target: null,
    });
  });

  it("names the top level as null in a folder-less list", () => {
    const rootFirst = pageRow(1, "A", null);
    const rootSecond = pageRow(2, "B", null);
    const move = siblingMoveOf(rootFirst, [rootFirst, rootSecond], false, "down");

    expect(buildMoveBody([rootFirst], move.target as never).after).toEqual({
      collection: "pages",
      expected: { parentId: null },
      id: 2,
    });
  });
});
