import type { AnalyticsProvider } from "../../types/provider";

export type LeadActionInstaller = (provider: AnalyticsProvider) => () => void;
