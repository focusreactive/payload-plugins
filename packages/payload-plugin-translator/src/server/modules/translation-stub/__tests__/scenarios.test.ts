import { describe, expect, it } from "vitest";

import { StubWorld } from "../model/StubWorld.js";
import { SCENARIOS } from "../scenarios/scenarios.js";
import type { ScenarioName } from "../scenarios/scenarios.js";

const LOCALES = { source: "en", targets: ["de", "fr", "es"] };
const A_PAGE = Array.from({ length: 30 }, (_, index) => String(index + 1));

const kindsShownBy = (name: ScenarioName) => {
  const world = new StubWorld(SCENARIOS[name]);
  const locales = A_PAGE.flatMap(
    (id) => world.documentState({ collection: "posts", id }, LOCALES).locales
  );
  return {
    contents: new Set(locales.map((l) => l.content.kind)),
    runs: new Set(locales.map((l) => l.run?.status ?? "none")),
  };
};

describe("scenarios", () => {
  it("mixed shows every content kind and run status over one page of documents", () => {
    const { contents, runs } = kindsShownBy("mixed");

    expect(contents).toEqual(new Set(["tracked", "empty", "untracked", "filled"]));
    expect(runs).toEqual(new Set(["none", "queued", "running", "failed", "not-started"]));
  });

  it("mixed seeds the same document the same way on every boot", () => {
    const boot = () => new StubWorld(SCENARIOS.mixed, () => "2026-11-13T12:00:00.000Z");
    const first = boot().documentState({ collection: "posts", id: "7" }, LOCALES);
    const again = boot().documentState({ collection: "posts", id: "7" }, LOCALES);

    expect(again).toEqual(first);
  });

  it("empty leaves every locale empty, with no run", () => {
    const { contents, runs } = kindsShownBy("empty");

    expect(contents).toEqual(new Set(["empty"]));
    expect(runs).toEqual(new Set(["none"]));
  });

  it("provenance-off shows only empty and filled", () => {
    expect(kindsShownBy("provenance-off").contents).toEqual(new Set(["empty", "filled"]));
  });

  it("tells drifted leaves apart from unanswered ones in mixed", () => {
    const world = new StubWorld(SCENARIOS.mixed);
    const verdicts = A_PAGE.flatMap((id) =>
      world
        .documentState({ collection: "posts", id }, LOCALES)
        .locales.flatMap((l) =>
          l.content.kind === "tracked" ? Object.values(l.content.verdicts) : []
        )
    );

    expect(new Set(verdicts)).toEqual(new Set(["current", "drifted", "unanswered"]));
  });
});
