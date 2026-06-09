import { describe, expect, it } from "vitest";
import { CHECK_IDS } from "../../src/constants/checkIds";
import { resolveVisualization } from "../../src/ui/CheckRow/CheckVisualization/resolveVisualization";
import type { CheckResult } from "../../src/engine/types/analysis";

const ALL = [...CHECK_IDS.keyphrase, ...CHECK_IDS.onPage, ...CHECK_IDS.readability];
const mk = (id: string, over: Partial<CheckResult> = {}): CheckResult => ({ id, status: "good", score: 9, ...over });

describe("resolveVisualization", () => {
  it("falls back to presence for an unknown id", () => {
    expect(resolveVisualization(mk("totally-unknown")).type).toBe("presence");
  });

  it("never throws and degrades to presence when a known check has no data", () => {
    for (const id of ALL) {
      expect(() => resolveVisualization(mk(id)), `${id} threw`).not.toThrow();
    }
  });

  it("builds value-range props for keyphraseDensity from data", () => {
    const v = resolveVisualization(mk("keyphraseDensity", { data: { densityPct: 2 } }));
    expect(v.type).toBe("value-range");
    if (v.type !== "value-range") throw new Error("type");
    expect(v.props.markerLabel).toBe("2.0%");
    expect(v.props.markerStatus).toBe("good");
  });

  it("suppresses the density gauge under 100 words (→ presence)", () => {
    expect(resolveVisualization(mk("keyphraseDensity", { data: { densityPct: 100, textLength: 12 } })).type).toBe("presence");
    expect(resolveVisualization(mk("keyphraseDensity", { data: { densityPct: 1.8, textLength: 250 } })).type).toBe("value-range");
  });

  it("builds proportion props with a dofollow/nofollow legend for externalLinks", () => {
    const v = resolveVisualization(mk("externalLinks", { data: { total: 4, follow: 3 } }));
    expect(v.type).toBe("proportion");
    if (v.type !== "proportion") throw new Error("type");
    expect(v.props.countLabel).toBe("3 / 4");
    expect(v.props.legend).toEqual([
      { tone: "good", label: "3 dofollow" },
      { tone: "muted", label: "1 nofollow" },
    ]);
  });

  it("builds count-drilldown props for textCompetingLinks", () => {
    const v = resolveVisualization(mk("textCompetingLinks", { data: { items: [{ left: "a", right: "b" }] } }));
    expect(v.type).toBe("count-drilldown");
    if (v.type !== "count-drilldown") throw new Error("type");
    expect(v.props.label).toBe("Show 1 link");
  });

  it("builds distribution props for keyphraseDistribution", () => {
    const v = resolveVisualization(mk("keyphraseDistribution", { data: { positions: [10, 50, 90] } }));
    expect(v.type).toBe("distribution");
    if (v.type !== "distribution") throw new Error("type");
    expect(v.props.positions).toEqual([10, 50, 90]);
  });

  it("treats genuine presence checks (incl. images with a count) as presence", () => {
    expect(resolveVisualization(mk("singleH1")).type).toBe("presence");
    expect(resolveVisualization(mk("images", { data: { count: 3 } })).type).toBe("presence");
  });
});
