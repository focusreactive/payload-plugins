import { MAX_PERCENT } from "../../constants";
import { scoreToStatus } from "../scoreStatus";
import type { Status } from "../types/analysis";
import type { GaugeBand, GaugeModel, GaugeSpec, GaugeTickLabel } from "../types/visualization";
import { formatGaugeValue } from "./formatGaugeValue";
import { AXIS_HEADROOM } from "./gaugeSpecs";

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

function axisMaxOf(spec: GaugeSpec, markerValue: number): number {
  if (!spec.openEnded) return spec.axisMax;

  const fitted = Math.ceil(markerValue * AXIS_HEADROOM);
  const capped = spec.unit === "percent" ? Math.min(MAX_PERCENT, fitted) : fitted;

  return Math.max(spec.axisMax, capped);
}

export function buildGauge(spec: GaugeSpec, markerValue: number, markerLabel: string): GaugeModel {
  const axisMax = axisMaxOf(spec, markerValue);
  const toPct = (v: number): number => ((v - spec.axisMin) / (axisMax - spec.axisMin)) * 100;

  const edges = [spec.axisMin, ...spec.thresholds, axisMax];

  const statusAt = (i: number): Status => {
    if (spec.statusSource === "yoast") {
      const score = spec.scores[i];
      return scoreToStatus(score ?? 0);
    }
    return spec.statuses[i] ?? "bad";
  };

  const bands: GaugeBand[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i] ?? spec.axisMin;
    const hi = edges[i + 1] ?? axisMax;

    bands.push({
      startPct: toPct(lo),
      endPct: toPct(hi),
      status: statusAt(i),
    });
  }

  const markerPct = clamp(toPct(markerValue), 0, 100);

  const lastBandIndex = bands.length - 1;
  let markerBandIndex = lastBandIndex;
  for (let i = 0; i < lastBandIndex; i++) {
    const upper = edges[i + 1] ?? axisMax;
    if (markerValue <= upper) {
      markerBandIndex = i;
      break;
    }
  }
  const markerBand = bands[markerBandIndex] ?? bands[lastBandIndex];
  const markerStatus: Status = markerBand?.status ?? "bad";

  const labels: GaugeTickLabel[] = [
    {
      pct: toPct(spec.axisMin),
      text: formatGaugeValue(spec.axisMin, spec.unit),
    },
  ];

  const goodIndex = bands.findIndex((band) => band.status === "good");
  const goodBand = goodIndex === -1 ? undefined : bands[goodIndex];
  if (goodBand) {
    const goodLo = edges[goodIndex] ?? spec.axisMin;
    const goodHi = edges[goodIndex + 1] ?? axisMax;
    const goodRunsOn = spec.openEnded && goodIndex === bands.length - 1;
    labels.push({
      pct: (goodBand.startPct + goodBand.endPct) / 2,
      text: goodRunsOn
        ? `≥ ${formatGaugeValue(goodLo, spec.unit)}`
        : `${formatGaugeValue(goodLo, spec.unit)}–${formatGaugeValue(goodHi, spec.unit)}`,
      emphasis: "good",
    });
  }

  if (!spec.openEnded) {
    labels.push({
      pct: toPct(axisMax),
      text: formatGaugeValue(axisMax, spec.unit),
    });
  }

  return { bands, markerPct, markerLabel, markerStatus, labels };
}
