import type { PayloadRequest } from "payload";
import type { Translations } from "../translations/types";
import type { AnalyticsLayoutConfigInput, BlockDefinition, BlockId } from "./layout";
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

export interface AbIntegrationConfig {
  /** Slug of the AB plugin's experiments collection. Default: 'ab-experiments'. */
  experimentsCollectionSlug?: string;
  dimensions?: {
    experiment?: string;
    variant?: string;
    visitorId?: string;
  };
  stats?: {
    alpha?: number;
    power?: number;
    srmThreshold?: number;
    srmWindowDays?: number;
  };
  /**
   * Win-rate qualification overrides. `alpha`/`power` are inherited from `stats`.
   * `mdeCeiling`: an experiment qualifies when its relative MDE ≤ this (default 0.20).
   * `sessionFloor`: per-bucket session floor to qualify and to crown a winner (default 100).
   */
  winRate?: {
    mdeCeiling?: number;
    sessionFloor?: number;
  };
  variantFields?: {
    variantOf?: string;
    passPercentage?: string;
    slug?: string;
    name?: string;
  };
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
  layout?: AnalyticsLayoutConfigInput;
  /**
   * Enables the A/B analytics tab. Presence of this block
   * turns the tab on; absence hides it. Reads the AB plugin's lifecycle
   * collection + fr_ab_* GA4 dimensions.
   */
  ab?: AbIntegrationConfig;
}
