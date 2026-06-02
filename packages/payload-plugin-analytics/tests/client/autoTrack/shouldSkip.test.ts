import { afterEach, describe, expect, it } from "vitest";
import { shouldSkip } from "../../../src/client/autoTrack/shouldSkip";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("shouldSkip", () => {
  it("returns false for null target", () => {
    expect(shouldSkip(null)).toBe(false);
  });

  it("returns false for non-Element targets (e.g. window)", () => {
    expect(shouldSkip(window)).toBe(false);
  });

  it("returns false when no skip ancestor exists", () => {
    document.body.innerHTML = '<a id="t" href="#">x</a>';
    const t = document.querySelector("#t")!;
    expect(shouldSkip(t)).toBe(false);
  });

  it("returns true when target itself has data-analytics-skip", () => {
    document.body.innerHTML = '<a id="t" href="#" data-analytics-skip="1">x</a>';
    const t = document.querySelector("#t")!;
    expect(shouldSkip(t)).toBe(true);
  });

  it("returns true when ancestor has data-analytics-skip", () => {
    document.body.innerHTML = '<div data-analytics-skip="1"><a id="t" href="#">x</a></div>';
    const t = document.querySelector("#t")!;
    expect(shouldSkip(t)).toBe(true);
  });
});
