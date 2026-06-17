import { describe, expect, it, beforeEach } from "vitest";
import { topSourcesMock } from "../../../../src/services/analyticsService/mocks/topSources";
import { topDevicesMock } from "../../../../src/services/analyticsService/mocks/topDevices";
import { topCountriesMock } from "../../../../src/services/analyticsService/mocks/topCountries";
import { topEventsMock } from "../../../../src/services/analyticsService/mocks/topEvents";
import { setActiveExistingRefs, __clearActiveExistingRefs } from "../../../../src/services/pageFilter/activeRefsHolder";

const DIM = "customEvent:fr_page_ref";
const filtered = { dimensionFilter: { filter: { fieldName: DIM, inListFilter: { values: ["pages:1"] } } } };

type Res = { rows: Array<{ metricValues: Array<{ value: string }> }> };

describe("3A dimensional mocks honor the ref filter", () => {
  beforeEach(() => {
    __clearActiveExistingRefs();
    setActiveExistingRefs(["pages:1"]);
  });

  it("filtered top-sources totals are strictly less than unfiltered (missing page's traffic removed)", () => {
    const sum = (r: Res) => r.rows.reduce((a, x) => a + Number(x.metricValues[0].value), 0);
    const unfiltered = sum(topSourcesMock({} as never) as Res);
    const withFilter = sum(topSourcesMock(filtered as never) as Res);
    expect(withFilter).toBeLessThan(unfiltered);
    expect(withFilter).toBeGreaterThan(0);
  });

  it("devices/countries/events all drop the missing page's contribution under filter", () => {
    const sum = (r: Res) => r.rows.reduce((a, x) => a + Number(x.metricValues[0].value), 0);
    for (const mock of [topDevicesMock, topCountriesMock, topEventsMock]) {
      expect(sum(mock(filtered as never) as Res)).toBeLessThan(sum(mock({} as never) as Res));
    }
  });
});
