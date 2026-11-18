import type { GaugeSpec, GaugeUnit } from "../types/visualization";

const PERCENT_DECIMALS = [1, 2, 3] as const;

export function formatGaugeValue(value: number, unit: GaugeUnit): string {
  switch (unit) {
    case "px":
      return `${value}px`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "words":
    case "chars":
    case "score":
      return String(value);
  }
}

function crossesThreshold(value: number, shown: number, thresholds: number[]): boolean {
  return thresholds.some(
    (threshold) =>
      (value > threshold && shown <= threshold) || (value < threshold && shown >= threshold)
  );
}

export function formatMarkerValue(value: number, spec: GaugeSpec): string {
  if (spec.unit !== "percent") return formatGaugeValue(value, spec.unit);

  const decimals =
    PERCENT_DECIMALS.find(
      (places) => !crossesThreshold(value, Number(value.toFixed(places)), spec.thresholds)
    ) ?? PERCENT_DECIMALS.at(-1);

  return `${value.toFixed(decimals)}%`;
}
