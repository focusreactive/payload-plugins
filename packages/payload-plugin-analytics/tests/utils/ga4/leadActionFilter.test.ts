import { describe, expect, it } from "vitest";
import { leadActionFilter } from "../../../src/utils/ga4";
import { LEAD_ACTION_EVENTS } from "../../../src/constants/events";

describe("leadActionFilter", () => {
  it("emits inListFilter on eventName with all 8 LEAD_ACTION_EVENTS values", () => {
    const expected = Object.values(LEAD_ACTION_EVENTS);
    expect(leadActionFilter()).toEqual({
      filter: {
        fieldName: "eventName",
        inListFilter: { values: expected },
      },
    });
    expect(expected.length).toBe(8);
  });
});
