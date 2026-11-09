import { describe, expect, it, vi } from "vitest";
import { languageOf, makeResearcher, registerResearcher } from "../../src/engine/researcherAdapter";
import { fakeResearcher } from "./fixtures/fakeResearchers";

vi.mock("yoastseo/build/languageProcessing/languages/en/Researcher", async () => {
  const { fakeEnglish } = await import("./fixtures/fakeResearchers");
  return { default: fakeEnglish };
});

const paper = (locale?: string) => ({ getLocale: () => locale });

describe("languageOf", () => {
  it.each([
    ["cs_CZ", "cs"],
    ["cs-CZ", "cs"],
    ["cs", "cs"],
    ["EN_us", "en"],
    [undefined, "en"],
    ["", "en"],
  ])("%s -> %s", (locale, lang) => {
    expect(languageOf(locale)).toBe(lang);
  });
});

describe("makeResearcher", () => {
  it("falls back to English for a language with no registered Researcher", () => {
    expect(makeResearcher(paper("de_DE")).getResearch("x")).toBe("en");
  });

  it("uses the registered Researcher for the paper's language", () => {
    registerResearcher("cs", fakeResearcher("cs"));
    expect(makeResearcher(paper("cs_CZ")).getResearch("x")).toBe("cs");
    expect(makeResearcher(paper("en_US")).getResearch("x")).toBe("en");
  });

  it("ignores a registration that is not a constructor", () => {
    registerResearcher("pl", { not: "a class" });
    expect(makeResearcher(paper("pl")).getResearch("x")).toBe("en");
  });

  it("tolerates a paper without getLocale", () => {
    expect(makeResearcher({}).getResearch("x")).toBe("en");
  });
});
