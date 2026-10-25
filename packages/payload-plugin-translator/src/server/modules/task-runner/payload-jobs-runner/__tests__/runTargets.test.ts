import { describe, expect, it } from "vitest";

import type { StoredRunTarget } from "../store/index.js";
import { DRIFT_CRITERION } from "../../../provenance/Provenance.criterion.js";
import { runLocales, runTargets } from "../store/runTargets.js";

describe("a run's target locales", () => {
  it("reads a row written in the current shape", () => {
    const targets: StoredRunTarget[] = [
      { lng: "de", filters: [{ kind: "leaves", addresses: ["title"] }] },
      { lng: "fr", filters: [] },
    ];

    expect(runTargets({ targets })).toEqual(targets);
  });

  it("answers nothing for a row that lists no locales either way", () => {
    expect(runTargets({})).toEqual([]);
  });

  describe("an entry the row carries in a shape nothing writes", () => {
    it("reads a missing filter list as naming no filter", () => {
      expect(runTargets({ targets: [{ lng: "de" }] })).toEqual([{ lng: "de", filters: [] }]);
    });

    it.each([
      ["a filter list that is not a list", { lng: "de", filters: "stale" }],
      ["a filter of an unknown kind", { lng: "de", filters: [{ kind: "colour", name: "red" }] }],
      ["no locale at all", { filters: [] }],
      ["nothing", null],
    ])("drops an entry carrying %s, rather than answering for it", (_label, entry) => {
      expect(runTargets({ targets: [entry, { lng: "fr", filters: [] }] })).toEqual([
        { lng: "fr", filters: [] },
      ]);
    });
  });

  it("gives the locale codes on their own", () => {
    expect(
      runLocales({
        targets: [
          { lng: "de", filters: [] },
          { lng: "fr", filters: [] },
        ],
      })
    ).toEqual(["de", "fr"]);
  });
});

describe("a run row written before 1.0", () => {
  it("reads its flat locale list as one target each, narrowing by nothing", () => {
    expect(runTargets({ target_lngs: ["de", "fr"] })).toEqual([
      { lng: "de", filters: [] },
      { lng: "fr", filters: [] },
    ]);
  });

  it("carries a skip_existing run's intent over as a rule filter", () => {
    expect(runTargets({ target_lngs: ["de"], strategy: "skip_existing" })).toEqual([
      { lng: "de", filters: [{ kind: "rule", name: "stale" }] },
    ]);
  });

  it("narrows by nothing for any other strategy it carried", () => {
    expect(runTargets({ target_lngs: ["de"], strategy: "overwrite" })).toEqual([
      { lng: "de", filters: [] },
    ]);
  });

  /**
   * The store spells the rule name rather than importing it, so that `store/` does not depend on the
   * optional provenance module. Nothing but this check keeps the two spellings equal.
   */
  it("names the rule provenance answers to", () => {
    const [target] = runTargets({ target_lngs: ["de"], strategy: "skip_existing" });

    expect(target?.filters).toEqual([{ kind: "rule", name: DRIFT_CRITERION }]);
  });
});
