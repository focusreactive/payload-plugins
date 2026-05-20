import type { RunReportMockFn } from "../mockRegistry";
import topSources from "../../../../__fixtures__/ga4/topSources.json";

export const topSourcesMock: RunReportMockFn = () => topSources as never;
