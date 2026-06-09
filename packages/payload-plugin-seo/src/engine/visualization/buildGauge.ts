import { scoreToStatus } from "../scoreStatus";
import type { Status } from "../types/analysis";
import type { GaugeBand, GaugeModel, GaugeSpec, GaugeTickLabel } from "../types/visualization";
import { formatGaugeValue } from "./formatGaugeValue";

export function buildGauge(spec: GaugeSpec, markerValue: number, markerLabel: string): GaugeModel {
  const toPct = (v: number): number => ((v - spec.axisMin) / (spec.axisMax - spec.axisMin)) * 100;

  const clamp = (n: number, lo: number, hi: number): number => Math.min(Math.max(n, lo), hi);

  const edges = [spec.axisMin, ...spec.thresholds, spec.axisMax];

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
    const hi = edges[i + 1] ?? spec.axisMax;

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
    const upper = edges[i + 1] ?? spec.axisMax;
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
    const goodHi = edges[goodIndex + 1] ?? spec.axisMax;
    labels.push({
      pct: (goodBand.startPct + goodBand.endPct) / 2,
      text: `${formatGaugeValue(goodLo, spec.unit)}–${formatGaugeValue(goodHi, spec.unit)}`,
      emphasis: "good",
    });
  }

  labels.push({
    pct: toPct(spec.axisMax),
    text: formatGaugeValue(spec.axisMax, spec.unit),
  });

  return { bands, markerPct, markerLabel, markerStatus, labels };
}
