import { DEFAULT_SEO_THRESHOLDS, SHORT_TITLE_WIDTH_PX } from "../constants";
import type { SeoFieldKind } from "../server/generate/prompts";
import type { ResolvedSeoThresholds } from "../types/config";
import type { RangeOverride } from "./measure";

export type FieldRange = Required<RangeOverride>;

export type FieldRanges = Record<SeoFieldKind, FieldRange>;

export function fieldRangesFor({
  titleWidth,
  metaDescriptionLength,
}: ResolvedSeoThresholds): FieldRanges {
  return {
    title: { min: SHORT_TITLE_WIDTH_PX, max: titleWidth.max },
    description: { min: metaDescriptionLength.min, max: metaDescriptionLength.max },
  };
}

export function fieldRangeOf(base: FieldRange, override: RangeOverride | undefined): FieldRange {
  return { min: override?.min ?? base.min, max: override?.max ?? base.max };
}

export const DEFAULT_FIELD_RANGES = fieldRangesFor(DEFAULT_SEO_THRESHOLDS);
