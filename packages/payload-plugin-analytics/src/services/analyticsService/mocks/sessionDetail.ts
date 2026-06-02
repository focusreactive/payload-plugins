import type { RunReportMockFn } from "../mockRegistry";
import sessionDetail from "../../../../__fixtures__/ga4/sessionDetail.json";

export const sessionDetailMock: RunReportMockFn = () => sessionDetail as never;
