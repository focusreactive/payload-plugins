import { describe, expect, it } from "vitest";
import { humanizeType } from "../../../src/utils/leadActions/humanizeType";

describe("humanizeType", () => {
  it("converts snake_case to Sentence case", () => {
    expect(humanizeType("phone_click")).toBe("Phone click");
    expect(humanizeType("cta_pricing_click")).toBe("Cta pricing click");
  });

  it("handles single-word values", () => {
    expect(humanizeType("submit")).toBe("Submit");
  });

  it("handles empty string", () => {
    expect(humanizeType("")).toBe("");
  });

  it("collapses repeated underscores", () => {
    expect(humanizeType("phone__click")).toBe("Phone click");
  });
});
