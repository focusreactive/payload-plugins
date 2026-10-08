import { describe, expect, it } from "vitest";

import { handleOf } from "../handleOf.js";

describe("handleOf", () => {
  it("passes a textual id through", () => {
    expect(handleOf({ id: "6704f1c0a1b2c3d4e5f60718" })).toBe("6704f1c0a1b2c3d4e5f60718");
  });

  it("spells a numeric id as a string, so both databases answer the same way", () => {
    expect(handleOf({ id: 42 })).toBe("42");
  });

  it.each([
    ["a row with no id", {}],
    ["nothing at all", undefined],
    ["an id of a kind no database hands back", { id: { oid: "x" } }],
  ])("has no handle for %s", (_label, candidate) => {
    expect(handleOf(candidate)).toBeNull();
  });
});
