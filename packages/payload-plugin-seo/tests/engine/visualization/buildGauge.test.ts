import { describe, expect, it } from "vitest";
import type { GaugeSpec } from "../../../src/engine/types/visualization";
import { buildGauge } from "../../../src/engine/visualization/buildGauge";
import { GAUGE_SPECS } from "../../../src/engine/visualization/gaugeSpecs";

const keyphraseLength = GAUGE_SPECS.keyphraseLength as GaugeSpec;
const keyphraseDensity = GAUGE_SPECS.keyphraseDensity as GaugeSpec;
const metaDescriptionLength = GAUGE_SPECS.metaDescriptionLength as GaugeSpec;
const passiveVoice = GAUGE_SPECS.passiveVoice as GaugeSpec;
const textTransitionWords = GAUGE_SPECS.textTransitionWords as GaugeSpec;
const fleschReadingEase = GAUGE_SPECS.fleschReadingEase as GaugeSpec;

describe("buildGauge — boundary landing (keyphraseLength)", () => {
  it("places a marker on a threshold exactly on the GOOD band end with good status", () => {
    const model = buildGauge(keyphraseLength, 4, "4");
    const goodBand = model.bands.find((band) => band.status === "good");

    expect(model.markerPct).toBeCloseTo((4 / 12) * 100);
    expect(goodBand).toBeDefined();
    expect(model.markerPct).toBeCloseTo(goodBand?.endPct ?? Number.NaN);
    expect(model.markerStatus).toBe("good");
  });

  it("places a marker inside the WARN band strictly between its edges with warn status", () => {
    const model = buildGauge(keyphraseLength, 5, "5");
    const warnBand = model.bands.find((band) => band.status === "warn");

    expect(warnBand).toBeDefined();
    expect(model.markerPct).toBeGreaterThan(warnBand?.startPct ?? Number.NaN);
    expect(model.markerPct).toBeLessThan(warnBand?.endPct ?? Number.NaN);
    expect(model.markerStatus).toBe("warn");
  });
});

describe("buildGauge — faithful bands (keyphraseDensity)", () => {
  it("emits exactly three bands matching the scored statuses with no warn band", () => {
    const model = buildGauge(keyphraseDensity, 1, "1");
    const statuses = model.bands.map((band) => band.status);

    expect(model.bands).toHaveLength(3);
    expect(statuses).toEqual(["bad", "good", "bad"]);
    expect(statuses).not.toContain("warn");
  });
});

describe("buildGauge — marker clamping (keyphraseLength)", () => {
  it("clamps an over-range marker to 100", () => {
    expect(buildGauge(keyphraseLength, 99, "99").markerPct).toBe(100);
  });

  it("clamps an under-range marker to 0", () => {
    expect(buildGauge(keyphraseLength, -5, "-5").markerPct).toBe(0);
  });
});

describe("buildGauge — success-label centering", () => {
  it("centers the good emphasis label on the good band of keyphraseLength", () => {
    const model = buildGauge(keyphraseLength, 4, "4");
    const goodLabels = model.labels.filter((label) => label.emphasis === "good");

    expect(goodLabels).toHaveLength(1);
    expect(goodLabels[0]?.pct).toBeCloseTo((0 + (4 / 12) * 100) / 2);
  });

  it("centers the ideal label on the good half of a two-band good/bad spec, not the axis midpoint", () => {
    const spec: GaugeSpec = {
      statusSource: "direct",
      axisMin: 0,
      axisMax: 10,
      thresholds: [5],
      statuses: ["good", "bad"],
      unit: "score",
    };

    const model = buildGauge(spec, 3, "3");
    const idealLabel = model.labels.find((label) => label.emphasis === "good");

    expect(idealLabel?.pct).toBe(25);
    expect(idealLabel?.pct).not.toBe(50);
  });
});

describe("buildGauge — direction shapes (band status order)", () => {
  it("orders passiveVoice (lower-is-better) bands good→warn→bad", () => {
    const model = buildGauge(passiveVoice, 5, "5");

    expect(model.bands.map((band) => band.status)).toEqual(["good", "warn", "bad"]);
  });

  it("orders textTransitionWords (higher-is-better) bands bad→warn→good", () => {
    const model = buildGauge(textTransitionWords, 5, "5");

    expect(model.bands.map((band) => band.status)).toEqual(["bad", "warn", "good"]);
  });

  it("orders metaDescriptionLength (band-in-the-middle) bands warn→good→warn", () => {
    const model = buildGauge(metaDescriptionLength, 130, "130");

    expect(model.bands.map((band) => band.status)).toEqual(["warn", "good", "warn"]);
  });
});

describe("buildGauge — direct statuses (fleschReadingEase)", () => {
  it("orders bands bad→warn→good with edges at the threshold percentages", () => {
    const model = buildGauge(fleschReadingEase, 70, "70");
    const statuses = model.bands.map((band) => band.status);

    expect(statuses).toEqual(["bad", "warn", "good"]);
    expect(model.bands[0]?.endPct).toBe(50);
    expect(model.bands[1]?.endPct).toBe(60);
  });
});
