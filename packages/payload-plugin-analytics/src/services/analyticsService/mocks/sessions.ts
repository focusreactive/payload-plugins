import type { BatchRunReportsMockFn } from "../mockRegistry";
import sessionsBatch from "../../../../__fixtures__/ga4/sessions.batch.json";

export const sessionsMock: BatchRunReportsMockFn = () => sessionsBatch as never;
