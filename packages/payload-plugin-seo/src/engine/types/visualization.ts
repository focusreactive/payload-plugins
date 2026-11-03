import type { Message } from "../../translations/types";
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

export type SwatchTone = "good" | "warn" | "bad" | "muted";

export interface SegmentModel {
  countLabel?: string;
  filledPct: number;
  filledStatus: Status;
  legend?: { tone: SwatchTone; label: Message }[];
}

/** What a drilldown lists; the button reads "Show 3 links" in the admin language. */
export type DrilldownNoun = "link" | "section" | "paragraph" | "group";

export interface DrilldownModel {
  items: { left: string; right: string }[];
  noun: DrilldownNoun;
}

export interface DistributionModel {
  positions: number[];
}

export type Visualization =
  | { type: "presence" }
  | { type: "value-range"; gauge: GaugeModel }
  | { type: "proportion"; segment: SegmentModel }
  | { type: "count-drilldown"; drilldown: DrilldownModel }
  | { type: "distribution"; distribution: DistributionModel };
