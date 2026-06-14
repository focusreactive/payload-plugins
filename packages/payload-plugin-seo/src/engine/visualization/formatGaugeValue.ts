import type { GaugeUnit } from "../types/visualization";

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
