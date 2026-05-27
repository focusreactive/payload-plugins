import type { MetricTone } from "../types";

export function deriveTone(value: number, prevValue: number, invertDelta: boolean): MetricTone {
  if (value === prevValue) return "flat";

  const isUp = value > prevValue;

  if (invertDelta) return isUp ? "negative" : "positive";

  return isUp ? "positive" : "negative";
}
