import type { Status } from "./analysis";

export interface GaugeBand {
  startPct: number;
  endPct: number;
  status: Status;
}

export interface GaugeTickLabel {
  pct: number;
  text: string;
  emphasis?: "good";
}

export interface GaugeModel {
  bands: GaugeBand[];
  markerPct: number;
  markerLabel: string;
  markerStatus: Status;
  labels: GaugeTickLabel[];
}

export type GaugeUnit = "words" | "chars" | "px" | "percent" | "score";

interface YoastScoredSpec {
  statusSource: "yoast";
  axisMin: number;
  axisMax: number;
  thresholds: number[];
  scores: number[];
  unit: GaugeUnit;
}

interface DirectStatusSpec {
  statusSource: "direct";
  axisMin: number;
  axisMax: number;
  thresholds: number[];
  statuses: Status[];
  unit: GaugeUnit;
}

export type GaugeSpec = YoastScoredSpec | DirectStatusSpec;
