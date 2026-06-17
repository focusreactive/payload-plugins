// tests/services/analyticsService/mocks/refInListFromRequest.test.ts
import { describe, expect, it } from "vitest";
import { refInListFromRequest } from "../../../../src/services/analyticsService/mocks/refInListFromRequest";

const DIM = "customEvent:fr_page_ref";

describe("refInListFromRequest", () => {
  it("reads a standalone inList filter", () => {
    const req = { dimensionFilter: { filter: { fieldName: DIM, inListFilter: { values: ["pages:1", "__home"] } } } };
    expect(refInListFromRequest(req, DIM)).toEqual(["pages:1", "__home"]);
  });

  it("reads an inList nested in an andGroup", () => {
    const req = {
      dimensionFilter: {
        andGroup: {
          expressions: [{ filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } } }, { filter: { fieldName: DIM, inListFilter: { values: ["pages:2"] } } }],
        },
      },
    };
    expect(refInListFromRequest(req, DIM)).toEqual(["pages:2"]);
  });

  it("returns null when no fr_page_ref inList is present", () => {
    expect(refInListFromRequest({ dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { value: "x" } } } }, DIM)).toBeNull();
    expect(refInListFromRequest({}, DIM)).toBeNull();
  });
});
