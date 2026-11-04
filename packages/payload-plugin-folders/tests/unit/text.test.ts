import { describe, expect, it } from "vitest";

import { pickLocalized, textOrNull, toText } from "../../src/core/text.js";

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

describe("pickLocalized", () => {
  it("takes the locale's own value, else the default locale's", () => {
    const title = { de: "Titel", en: "Title", fr: "" };

    expect(pickLocalized(title, "de", "en")).toBe("Titel");
    expect(pickLocalized(title, "fr", "en")).toBe("Title");
    expect(pickLocalized(title, "es", "en")).toBe("Title");
  });

  it("is empty when neither the locale nor the default has a value", () => {
    expect(pickLocalized({ de: "" }, "de", "en")).toBe("");
  });

  it("gives a field that is not localized to every locale", () => {
    expect(pickLocalized("Home", "de", "en")).toBe("Home");
    expect(pickLocalized(undefined, "de", "en")).toBe("");
    expect(pickLocalized(null, "de", "en")).toBe("");
  });
});
