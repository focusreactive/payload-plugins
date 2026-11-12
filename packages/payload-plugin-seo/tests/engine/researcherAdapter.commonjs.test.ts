import { describe, expect, it, vi } from "vitest";
import { makeResearcher, registerResearcher } from "../../src/engine/researcherAdapter";
import { fakeResearcherAnswering } from "./fixtures/fakeResearchers";

vi.mock("yoastseo/build/languageProcessing/languages/en/Researcher", async () => {
  const { fakeEnglish } = await import("./fixtures/fakeResearchers");
  return { default: { __esModule: true, default: fakeEnglish } };
});

const paper = (locale?: string) => ({ getLocale: () => locale });

describe("researcherAdapter with CommonJS module objects", () => {
  it("constructs the English researcher when the default import is the whole module", () => {
    expect(makeResearcher(paper("en_US")).getResearch("x")).toBe("en");
  });

  it("registers a researcher passed as a CommonJS module object", () => {
    registerResearcher("cs", { __esModule: true, default: fakeResearcherAnswering("cs") });
    expect(makeResearcher(paper("cs_CZ")).getResearch("x")).toBe("cs");
  });
});
