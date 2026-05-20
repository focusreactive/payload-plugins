import type { RunReportMockFn } from "../mockRegistry";
import topCountries from "../../../../__fixtures__/ga4/topCountries.json";

export const topCountriesMock: RunReportMockFn = () => topCountries as never;
