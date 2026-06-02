import type { DateRange, Comparison } from "./query";

/** Query body for all per-experiment drawer endpoints. */
export interface AbExperimentQuery {
  manifestKey: string;
  dateRange: DateRange;
  comparison?: Comparison;
}

/** Per-bucket raw counts returned by the bucket query (GA4-derived). */
export interface AbBucketCounts {
  bucket: string;
  name: string | null;
  visitors: number;
  sessions: number;
  convertingSessions: number;
  rawConversions: number;
  configuredShare: number | null;
}

/** One KPI-strip payload. */
export interface AbKpisResponse {
  activeExperiments: number;
  variantsLive: number;
  exposedSessions: number;
  leadConversions: number;
  avgAgeDays: number;
  /** count of running experiments failing SRM */
  needingAttention: number;
  winRate: {
    rate: number | null;
    winners: number;
    qualified: number;
    notQualified: number;
  };
  comparison?: {
    exposedSessions: number;
    leadConversions: number;
  };
  missing?: string[];
}

/**
 * Statistically-derived outcome for the table's Outcome badge:
 *   srm        — SRM failure
 *   winner     — a crowned significant winner exists
 *   no_effect  — qualified for the win-rate denominator but no significant winner
 *   collecting — not yet qualified (underpowered / below the session floor)
 */
export type AbExperimentOutcome = "srm" | "winner" | "no_effect" | "collecting";

/** One row in the experiments table. */
export interface AbExperimentListRow {
  manifestKey: string;
  parentTitle: string | null;
  startedAt: string;
  variantCount: number;
  visitors: number;
  conversions: number;
  bestRelativeLift: number | null;
  bestSignificant: boolean;
  bestPValue: number | null;
  srmPassed: boolean;
  srmPValue: number;
  outcome: AbExperimentOutcome;
  lastUpdated: string | null;
}

export interface AbExperimentsListResponse {
  rows: AbExperimentListRow[];
  missing?: string[];
}

export interface AbExperimentHeaderResponse {
  manifestKey: string;
  parentTitle: string | null;
  startedAt: string | null;
  daysRunning: number | null;
  variantCount: number;
  mdeRelative: number | null;
  mdeCeiling: number;
}

export interface AbExposureResponse {
  buckets: AbBucketCounts[];
  srmPassed: boolean;
  srmPValue: number;
  missing?: string[];
}

export interface AbOutcomeRow extends AbBucketCounts {
  conversionRate: number;
  absoluteLift: number | null;
  relativeLift: number | null;
  pValue: number | null;
  /** Φ(z) confidence the variant beats control, 0-1; null for control. Label "Confidence", NOT "win probability". */
  confidence: number | null;
  /** z-test verdict for this row (any significant variant), distinct from the crowned winnerBucket below */
  verdict: "winner" | "loser" | "ns" | null;
}

export interface AbOutcomeResponse {
  rows: AbOutcomeRow[];
  /** the single crowned winner: highest-confidence variant clearing significance + positive lift + session floor */
  winnerBucket: string | null;
  /** highest-confidence variant overall (provisional leader) */
  leaderBucket: string | null;
  /** significance threshold used (echoed for the drawer's explanatory note) */
  alpha: number;
  /** per-bucket session floor used for the winner crown (echoed for the note) */
  sessionFloor: number;
  missing?: string[];
}

export interface AbTimeSeriesDay {
  date: string;
  cumulativeConvertingSessions: number;
  cumulativeSessions: number;
}

export interface AbTimeSeriesSeries {
  bucket: string;
  name: string | null;
  days: AbTimeSeriesDay[];
}

export interface AbTimeSeriesResponse {
  series: AbTimeSeriesSeries[];
  significanceDates: Record<string, string | null>;
  missing?: string[];
}

export interface AbLeadBreakdownRow {
  leadType: string;
  byBucket: Record<string, number>;
}

export interface AbLeadBreakdownResponse {
  buckets: Array<{ bucket: string; name: string | null; sessions: number }>;
  rows: AbLeadBreakdownRow[];
  missing?: string[];
}
