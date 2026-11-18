import { describe, expect, it } from "vitest";

import { localeChoicesOf } from "../localeChoices.js";

describe("the host's locales as the panel names them", () => {
  it("takes a plain label, the English one of several, else the first, else the code", () => {
    expect(
      localeChoicesOf([
        { code: "de", label: "Deutsch" },
        { code: "fr", label: { de: "Französisch", en: "French" } },
        { code: "es", label: { de: "Spanisch" } },
        { code: "it" },
      ])
    ).toEqual([
      { code: "de", label: "Deutsch" },
      { code: "fr", label: "French" },
      { code: "es", label: "Spanisch" },
      { code: "it", label: "it" },
    ]);
  });
});
