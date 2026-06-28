import { getTitleProgressGuarded } from "../engine/helpers/title-progress";
import { DESCRIPTION_RANGE, TITLE_RANGE } from "../constants/generation";

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

function statusFor(value: number, min: number, max: number): LengthStatus {
  if (value > max) return "long";
  if (value < min) return "short";
  return "good";
}

export function measureTitle(text: string, range?: RangeOverride): Measurement {
  const progress = getTitleProgressGuarded(text ?? "");
  const min = range?.min ?? TITLE_RANGE.min;
  const max = range?.max ?? progress.max ?? TITLE_RANGE.max;

  return {
    unit: "px",
    value: progress.actual,
    min,
    max,
    status: statusFor(progress.actual, min, max),
  };
}

export function measureDescription(text: string, range?: RangeOverride): Measurement {
  const value = (text ?? "").length;
  const min = range?.min ?? DESCRIPTION_RANGE.min;
  const max = range?.max ?? DESCRIPTION_RANGE.max;

  return {
    unit: "char",
    value,
    min,
    max,
    status: statusFor(value, min, max),
  };
}
