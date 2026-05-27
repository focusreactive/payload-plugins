import { describe, expect, it } from "vitest";
import { leadActionFilter } from "../../../src/utils/ga4/leadActionFilter";

describe("leadActionFilter", () => {
  it("returns eventName==lead_action filter when no types are provided", () => {
    expect(leadActionFilter()).toEqual({
      filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } },
    });
  });

  it("AND-groups eventName filter with fr_lead_type IN list when types provided", () => {
    expect(leadActionFilter(["phone_click", "cta_pricing_click"])).toEqual({
      andGroup: {
        expressions: [
          { filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } } },
          {
            filter: {
              fieldName: "customEvent:fr_lead_type",
              inListFilter: { values: ["phone_click", "cta_pricing_click"] },
            },
          },
        ],
      },
    });
  });

  it("falls back to eventName-only filter when types array is empty", () => {
    expect(leadActionFilter([])).toEqual({
      filter: { fieldName: "eventName", stringFilter: { value: "lead_action" } },
    });
  });
});
