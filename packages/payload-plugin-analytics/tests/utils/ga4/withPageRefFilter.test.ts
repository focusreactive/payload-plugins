// tests/utils/ga4/withPageRefFilter.test.ts
import { describe, expect, it } from "vitest";
import { withPageRefFilter } from "../../../src/utils/ga4/withPageRefFilter";

const REFS = ["page:1", "__home"];

describe("withPageRefFilter", () => {
  it("adds a standalone inList filter when the request has none", () => {
    const req = { metrics: [{ name: "sessions" }], dimensions: [{ name: "sessionSource" }] };
    const out = withPageRefFilter(req, "customEvent:fr_page_ref", REFS);
    expect(out.dimensionFilter).toEqual({ filter: { fieldName: "customEvent:fr_page_ref", inListFilter: { values: REFS } } });
  });

  it("ANDs the inList with an existing dimensionFilter", () => {
    const existing = { filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } } };
    const req = { metrics: [{ name: "eventCount" }], dimensionFilter: existing };
    const out = withPageRefFilter(req, "customEvent:fr_page_ref", REFS);
    expect(out.dimensionFilter).toEqual({
      andGroup: {
        expressions: [existing, { filter: { fieldName: "customEvent:fr_page_ref", inListFilter: { values: REFS } } }],
      },
    });
  });

  it("returns the request unchanged when refs is empty", () => {
    const req = { metrics: [{ name: "sessions" }] };
    expect(withPageRefFilter(req, "customEvent:fr_page_ref", [])).toBe(req);
  });
});
