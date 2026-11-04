import { describe, expect, it } from "vitest";

import { relationIdOf } from "../../src/core/relationId.js";

describe("relationIdOf", () => {
  it("returns a string or number id as it is", () => {
    expect(relationIdOf(7)).toBe(7);
    expect(relationIdOf("abc")).toBe("abc");
  });

  it("returns the id of a populated document", () => {
    expect(relationIdOf({ id: 3 })).toBe(3);
    expect(relationIdOf({ id: "x", name: "Docs" })).toBe("x");
  });

  it("reads the wrapper a form holds for a relationship", () => {
    expect(relationIdOf({ relationTo: "folders", value: 5 })).toBe(5);
    expect(relationIdOf({ relationTo: "folders", value: { id: 6 } })).toBe(6);
  });

  it("returns null for an empty value or anything else", () => {
    expect(relationIdOf(null)).toBeNull();
    expect(relationIdOf(undefined)).toBeNull();
    expect(relationIdOf("")).toBeNull();
    expect(relationIdOf({})).toBeNull();
    expect(relationIdOf({ id: null })).toBeNull();
    expect(relationIdOf(true)).toBeNull();
  });
});
