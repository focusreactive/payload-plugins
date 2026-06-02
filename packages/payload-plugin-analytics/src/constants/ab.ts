export const DEFAULT_AB_EXPERIMENTS_SLUG = "ab-experiments";

export const DEFAULT_AB_DIMENSIONS = {
  experiment: "fr_ab_experiment",
  variant: "fr_ab_variant",
  visitorId: "fr_ab_visitor_id",
} as const;

export const DEFAULT_AB_VARIANT_FIELDS = {
  variantOf: "_abVariantOf",
  passPercentage: "_abPassPercentage",
  slug: "slug",
} as const;

export const AB_CONTROL_BUCKET = "original";

export const AB_STATS_DEFAULTS = {
  /** significance threshold */
  alpha: 0.05,
  /** statistical power 1 - beta */
  power: 0.8,
  /** SRM chi-square failure threshold */
  srmThreshold: 0.001,
  /** trailing window (days) for the SRM traffic-share check */
  srmWindowDays: 7,
} as const;

export const AB_WIN_RATE_DEFAULTS = {
  /** an experiment qualifies when its relative MDE ≤ this ceiling */
  mdeCeiling: 0.2,
  /** minimum sessions per compared bucket to qualify / to crown a winner */
  sessionFloor: 100,
} as const;

export const AB_IMPRESSION_EVENT = "ab_impression";
