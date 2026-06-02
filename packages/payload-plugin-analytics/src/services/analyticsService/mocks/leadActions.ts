import type { BatchRunReportsMockFn } from "../mockRegistry";
import leadActionsBatch from "../../../../__fixtures__/ga4/leadActions.batch.json";

export const leadActionsMock: BatchRunReportsMockFn = () => leadActionsBatch as never;
