import { describe, expect, it } from "vitest";
import { resolveLeadActionTypes } from "../../../src/utils/leadActions/resolveLeadActionTypes";
import { BUILT_IN_LEAD_ACTION_TYPES } from "../../../src/constants/events";

describe("resolveLeadActionTypes", () => {
  it("returns all 8 built-ins when input is undefined", () => {
    expect(resolveLeadActionTypes(undefined)).toEqual([...BUILT_IN_LEAD_ACTION_TYPES]);
  });

  it("returns empty array when input is explicitly empty", () => {
    expect(resolveLeadActionTypes([])).toEqual([]);
  });

  it("returns user list verbatim (replaces defaults) when input is non-empty", () => {
    expect(resolveLeadActionTypes(["cta_pricing_click", "phone_click"])).toEqual(["cta_pricing_click", "phone_click"]);
  });

  it("deduplicates user-provided list", () => {
    expect(resolveLeadActionTypes(["phone_click", "phone_click", "email_click"])).toEqual(["phone_click", "email_click"]);
  });
});
