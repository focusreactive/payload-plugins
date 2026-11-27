import { describe, expect, it } from "vitest";

import { Locales } from "../index.js";

describe("what a translation is translated from", () => {
  it("takes the collection's own choice over the project's default", () => {
    expect(Locales.resolveSource({ configured: "fr", localization: { defaultLocale: "en" } })).toBe(
      "fr"
    );
  });

  it("falls back to the project's default locale", () => {
    expect(
      Locales.resolveSource({ configured: undefined, localization: { defaultLocale: "en" } })
    ).toBe("en");
  });

  it("answers nothing where the host has no localization at all", () => {
    expect(Locales.resolveSource({ configured: undefined, localization: false })).toBeUndefined();
    expect(
      Locales.resolveSource({ configured: undefined, localization: undefined })
    ).toBeUndefined();
  });

  it("still answers the collection's choice where the host has no localization", () => {
    expect(Locales.resolveSource({ configured: "fr", localization: false })).toBe("fr");
  });
});
