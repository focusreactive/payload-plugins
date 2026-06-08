import { describe, expect, it } from "vitest";
import { isKeyphrasePending } from "../../src/components/SeoDrawer/keyphrasePending";

describe("isKeyphrasePending", () => {
  it("returns false for an empty live keyphrase regardless of analyzed value", () => {
    expect(isKeyphrasePending("", null)).toBe(false);
    expect(isKeyphrasePending("", "anything")).toBe(false);
  });

  it("returns false for a whitespace-only live keyphrase", () => {
    expect(isKeyphrasePending("   ", null)).toBe(false);
    expect(isKeyphrasePending("   ", "anything")).toBe(false);
  });

  it("returns true when typed but not yet analyzed (analyzed is null)", () => {
    expect(isKeyphrasePending("payload cms", null)).toBe(true);
  });

  it("returns true when live diverges from a previously analyzed value", () => {
    expect(isKeyphrasePending("payload cms plugins", "payload cms")).toBe(true);
  });

  it("returns false when the result for the live keyphrase has landed", () => {
    expect(isKeyphrasePending("payload cms", "payload cms")).toBe(false);
  });

  it("stays false on a form-field edit (live unchanged, analyzed re-set to same value)", () => {
    expect(isKeyphrasePending("payload cms", "payload cms")).toBe(false);
  });
});
