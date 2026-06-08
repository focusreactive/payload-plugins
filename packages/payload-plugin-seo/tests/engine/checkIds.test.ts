import { describe, expect, it } from "vitest";
import { CHECK_IDS } from "../../src/constants/checkIds";
import { partitionSeo } from "../../src/engine/partitionSeo";
import type { CheckResult } from "../../src/engine/types";

const mk = (id: string): CheckResult => ({ id, status: "good", score: 9 });

describe("CHECK_IDS", () => {
  it("has no id in more than one tab group", () => {
    const all = [...CHECK_IDS.keyphrase, ...CHECK_IDS.onPage, ...CHECK_IDS.readability];
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("partitionSeo", () => {
  it("routes ids into keyphrase vs on-page by CHECK_IDS, ignoring readability/unknown", () => {
    const checks = [mk("keyphraseDensity"), mk("titleWidth"), mk("passiveVoice"), mk("madeUpId")];
    const { keyphrase, onPage } = partitionSeo(checks);
    expect(keyphrase.map((c) => c.id)).toEqual(["keyphraseDensity"]);
    expect(onPage.map((c) => c.id)).toEqual(["titleWidth"]);
  });
});
