import type { RunReportMockFn } from "../mockRegistry";
import topDevices from "../../../../__fixtures__/ga4/topDevices.json";

export const topDevicesMock: RunReportMockFn = () => topDevices as never;
