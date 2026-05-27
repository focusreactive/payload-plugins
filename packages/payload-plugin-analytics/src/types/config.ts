import type { PayloadRequest } from "payload";
import type { Translations } from "../translations/types";
import type { AnalyticsLayoutConfig, BlockDefinition, BlockId } from "./layout";
import type { LeadActionsPluginConfig } from "./leadActions";

export interface Ga4Config {
  /** GA4 numeric Property ID — Data API. */
  propertyId: string;
  /** GA4 Measurement ID (G-XXXXXXX) — gtag.js. */
  measurementId: string;
  serviceAccount: {
    clientEmail: string;
    privateKey: string;
  };
}

export type AccessFn = (args: { req: PayloadRequest }) => boolean | Promise<boolean>;

export interface AutoTrackLeadActionsConfig {
  phoneClicks?: boolean;
  emailClicks?: boolean;
  directionsClicks?: boolean;
  whatsappClicks?: boolean;
  telegramClicks?: boolean;
  formSubmits?: boolean;
}

export interface AnalyticsPluginConfig {
  disabled?: boolean;
  ga4: Ga4Config;
  leadActions?: LeadActionsPluginConfig;
  autoTrackLeadActions?: AutoTrackLeadActionsConfig;
  access?: AccessFn;
  translations?: Translations;
  mocks?: boolean;
  blocks?: Record<BlockId, Partial<BlockDefinition>>;
  layout?: AnalyticsLayoutConfig;
}
