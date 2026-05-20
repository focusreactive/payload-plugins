import type { RunReportMockFn } from "../mockRegistry";
import topEvents from "../../../../__fixtures__/ga4/topEvents.json";

export const topEventsMock: RunReportMockFn = () => topEvents as never;
