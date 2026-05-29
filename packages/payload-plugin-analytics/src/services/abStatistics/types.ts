export interface TwoProportionZTestResult {
  /** variant conversion rate (proportion) */
  variantRate: number;
  /** control conversion rate (proportion) */
  controlRate: number;
  /** variantRate - controlRate, as a proportion (percentage points) */
  absoluteLift: number;
  /** (variantRate - controlRate) / controlRate, as a fraction */
  relativeLift: number;
  /** two-proportion z statistic */
  zScore: number;
  /** two-tailed p-value */
  pValue: number;
}

export type Verdict = "winner" | "loser" | "ns" | "none";

export interface SampleRatioMismatchResult {
  chiSquared: number;
  degreesOfFreedom: number;
  /** chi-square goodness-of-fit p-value */
  pValue: number;
  /** true when the observed split matches the configured split (pValue ≥ threshold) */
  passed: boolean;
}

export interface MinimumDetectableEffectResult {
  /** absolute detectable effect (proportion / percentage points) */
  absolute: number;
  /** relative detectable effect (fraction of control rate) */
  relative: number;
}

export interface WinnerCandidate {
  bucket: string;
  /** z-score of this variant vs control */
  zScore: number;
  /** relative lift vs control (fraction) */
  relativeLift: number;
  /** sessions in the smaller of (variant, control) — for the session floor */
  minBucketSessions: number;
}

export interface WinnerPick {
  /** highest-confidence variant clearing significance + positive lift + floor; null if none */
  winnerBucket: string | null;
  /** highest-confidence variant overall (provisional); null only when no candidates */
  leaderBucket: string | null;
}

export interface WinnerOpts {
  alpha: number;
  /** per-bucket session floor required to crown a winner */
  sessionFloor: number;
}

export interface QualifyInput {
  /** control conversion rate (proportion) */
  controlRate: number;
  /** smaller bucket sessions across the experiment's compared buckets */
  minBucketSessions: number;
  /** whether SRM passed for this experiment */
  srmPassed: boolean;
}

export interface QualifyOpts {
  mdeCeiling: number;
  /** per-bucket session floor required to qualify */
  sessionFloor: number;
  alpha: number;
  power: number;
}

export interface PortfolioExperiment {
  qualified: boolean;
  hasWinner: boolean;
}

export interface PortfolioWinRate {
  winners: number;
  qualified: number;
  notQualified: number;
  /** winners / qualified; null when qualified === 0 */
  rate: number | null;
}
