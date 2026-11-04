import { describe, expect, it } from "vitest";

import { textOrNull, toText } from "../../src/core/text.js";

describe("toText", () => {
  it("returns a string as it is, including the empty one", () => {
    expect(toText("abc")).toBe("abc");
    expect(toText("")).toBe("");
  });

  it("returns an empty string for anything that is not a string", () => {
    expect(toText(undefined)).toBe("");
    expect(toText(null)).toBe("");
    expect(toText(4)).toBe("");
    expect(toText({ en: "x" })).toBe("");
  });
});

describe("textOrNull", () => {
  it("returns a non-empty string", () => {
    expect(textOrNull("abc")).toBe("abc");
  });

  it("returns null for an empty string and for anything that is not a string", () => {
    expect(textOrNull("")).toBeNull();
    expect(textOrNull(undefined)).toBeNull();
    expect(textOrNull(4)).toBeNull();
  });
});
