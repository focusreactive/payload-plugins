import type { RunReportMockFn } from "../mockRegistry";
import topCountries from "../../../../__fixtures__/ga4/topCountries.json";
import topCities from "../../../../__fixtures__/ga4/topCities.json";

export const topCountriesMock: RunReportMockFn = (request) => {
  const firstDimension = request.dimensions?.[0]?.name;

  if (firstDimension === "city") {
    return topCities as never;
  }

  return topCountries as never;
};
