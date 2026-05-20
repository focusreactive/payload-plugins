import type { AnalyticsMockMap } from "../mockRegistry";
import { kpisMock } from "./kpis";
import { topPagesMock } from "./topPages";
import { topEventsMock } from "./topEvents";
import { topSourcesMock } from "./topSources";
import { topDevicesMock } from "./topDevices";
import { topCountriesMock } from "./topCountries";
import { sessionsMock } from "./sessions";
import { sessionDetailMock } from "./sessionDetail";
import { journeysMock } from "./journeys";
import { leadActionsMock } from "./leadActions";

export const defaultMocks: AnalyticsMockMap = {
  runReport: {
    kpis: kpisMock,
    topPages: topPagesMock,
    topEvents: topEventsMock,
    topSources: topSourcesMock,
    topDevices: topDevicesMock,
    topCountries: topCountriesMock,
    sessions: sessionsMock,
    sessionDetail: sessionDetailMock,
    journeys: journeysMock,
  },
  batchRunReports: {
    leadActions: leadActionsMock,
  },
};
