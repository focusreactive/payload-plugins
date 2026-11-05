import { describe, expect, it } from "vitest";
import { whereFieldPaths } from "../../src/utils/whereFieldPaths";

describe("whereFieldPaths", () => {
  it("collects field paths through and/or without values", () => {
    expect(whereFieldPaths({ and: [{ a: { equals: 1 } }, { or: [{ b: { in: [2] } }] }] })).toEqual([
      "a",
      "b",
    ]);
  });

  it("lists each path once", () => {
    expect(whereFieldPaths({ or: [{ a: { equals: 1 } }, { a: { equals: 2 } }] })).toEqual(["a"]);
  });
});
