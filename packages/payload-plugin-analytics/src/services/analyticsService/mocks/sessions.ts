import type { RunReportMockFn } from "../mockRegistry";
import sessionsMerged from "../../../../__fixtures__/ga4/sessions.merged.json";

export const sessionsMock: RunReportMockFn = () => sessionsMerged as never;
