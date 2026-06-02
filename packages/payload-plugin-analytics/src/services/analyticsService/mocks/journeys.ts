import type { RunReportMockFn } from "../mockRegistry";
import journeys from "../../../../__fixtures__/ga4/journeys.basic.json";

export const journeysMock: RunReportMockFn = () => journeys as never;
