import type { AbIntegrationConfig } from "../types/config";
import {
  AB_STATS_DEFAULTS,
  AB_WIN_RATE_DEFAULTS,
  DEFAULT_AB_DIMENSIONS,
  DEFAULT_AB_EXPERIMENTS_SLUG,
  DEFAULT_AB_VARIANT_FIELDS,
} from "../constants/ab";

export interface ResolvedAbConfig {
  experimentsCollectionSlug: string;
  dimensions: { experiment: string; variant: string; visitorId: string };
  stats: { alpha: number; power: number; srmThreshold: number; srmWindowDays: number };
  winRate: { mdeCeiling: number; sessionFloor: number };
  variantFields: { variantOf: string; passPercentage: string; slug: string; name: string };
}

export function resolveAbConfig(ab: AbIntegrationConfig | undefined): ResolvedAbConfig | null {
  if (!ab) return null;

  const slug = ab.variantFields?.slug ?? DEFAULT_AB_VARIANT_FIELDS.slug;

  return {
    experimentsCollectionSlug: ab.experimentsCollectionSlug ?? DEFAULT_AB_EXPERIMENTS_SLUG,
    dimensions: {
      experiment: ab.dimensions?.experiment ?? DEFAULT_AB_DIMENSIONS.experiment,
      variant: ab.dimensions?.variant ?? DEFAULT_AB_DIMENSIONS.variant,
      visitorId: ab.dimensions?.visitorId ?? DEFAULT_AB_DIMENSIONS.visitorId,
    },
    stats: {
      alpha: ab.stats?.alpha ?? AB_STATS_DEFAULTS.alpha,
      power: ab.stats?.power ?? AB_STATS_DEFAULTS.power,
      srmThreshold: ab.stats?.srmThreshold ?? AB_STATS_DEFAULTS.srmThreshold,
      srmWindowDays: ab.stats?.srmWindowDays ?? AB_STATS_DEFAULTS.srmWindowDays,
    },
    winRate: {
      mdeCeiling: ab.winRate?.mdeCeiling ?? AB_WIN_RATE_DEFAULTS.mdeCeiling,
      sessionFloor: ab.winRate?.sessionFloor ?? AB_WIN_RATE_DEFAULTS.sessionFloor,
    },
    variantFields: {
      variantOf: ab.variantFields?.variantOf ?? DEFAULT_AB_VARIANT_FIELDS.variantOf,
      passPercentage: ab.variantFields?.passPercentage ?? DEFAULT_AB_VARIANT_FIELDS.passPercentage,
      slug,
      name: ab.variantFields?.name ?? slug,
    },
  };
}
