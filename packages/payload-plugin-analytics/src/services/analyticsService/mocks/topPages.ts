import type { RunReportMockFn } from "../mockRegistry";
import topPages from "../../../../__fixtures__/ga4/topPages.json";

export const topPagesMock: RunReportMockFn = () => topPages as never;
