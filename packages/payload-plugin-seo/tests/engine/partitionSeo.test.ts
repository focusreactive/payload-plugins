import { describe, expect, it } from "vitest";
import { partitionSeo } from "../../src/engine/partitionSeo";

const results = [
  { id: "keyphraseDensity", status: "warn" as const, score: 6 },
  { id: "introductionKeyword", status: "bad" as const, score: 3 },
  { id: "textLength", status: "good" as const, score: 9 },
  { id: "internalLinks", status: "warn" as const, score: 6 },
  { id: "unknownThing", status: "good" as const, score: 9 },
];

describe("partitionSeo", () => {
  it("splits checks into keyphrase and on-page groups", () => {
    const { keyphrase, onPage } = partitionSeo(results);
    expect(keyphrase.map((c) => c.id).sort()).toEqual(["introductionKeyword", "keyphraseDensity"]);
    expect(onPage.map((c) => c.id).sort()).toEqual(["internalLinks", "textLength"]);
  });

  it("drops unknown identifiers from both groups", () => {
    const { keyphrase, onPage } = partitionSeo(results);
    expect([...keyphrase, ...onPage].map((c) => c.id)).not.toContain("unknownThing");
  });
});
