import { getTitleProgressGuarded } from "../engine/helpers/title-progress";
import { DEFAULT_FIELD_RANGES, fieldRangeOf } from "./fieldRanges";
import type { FieldRange } from "./fieldRanges";

export type LengthStatus = "good" | "short" | "long";
export type LengthUnit = "px" | "char";

export interface Measurement {
  unit: LengthUnit;
  value: number;
  min: number;
  max: number;
  status: LengthStatus;
}

export interface RangeOverride {
  min?: number;
  max?: number;
}

function titleStatus(value: number, max: number, explicitMin: number | undefined): LengthStatus {
  if (value > max) return "long";
  if (explicitMin !== undefined && value < explicitMin) return "short";
  return "good";
}

function descriptionStatus(value: number, { min, max }: FieldRange): LengthStatus {
  if (value > max) return "long";
  if (value <= min) return "short";
  return "good";
}

export function measureTitle(
  text: string,
  range?: RangeOverride,
  base: FieldRange = DEFAULT_FIELD_RANGES.title
): Measurement {
  const { actual } = getTitleProgressGuarded(text ?? "");
  const { min, max } = fieldRangeOf(base, range);

  return { unit: "px", value: actual, min, max, status: titleStatus(actual, max, range?.min) };
}

export function measureDescription(
  text: string,
  range?: RangeOverride,
  base: FieldRange = DEFAULT_FIELD_RANGES.description
): Measurement {
  const value = (text ?? "").length;
  const bounds = fieldRangeOf(base, range);

  return { unit: "char", value, ...bounds, status: descriptionStatus(value, bounds) };
}
