import { describe, expect, it } from "vitest";

import { resolveWorld } from "../../../../core/domain/world/index.js";
import type { World } from "../../../../core/domain/world/index.js";
import { layerOf } from "../targetLayer.js";
import type { TargetLayer } from "../targetLayer.js";

const LNG = "de";
const READS = { latest: "the latest read", published: "the published read" };

const singleLayer = resolveWorld({ drafts: false, autosave: false }, READS);
const layered = (autosave: boolean) => resolveWorld({ drafts: true, autosave }, READS);

const noDrafts: TargetLayer = { kind: "no-drafts", write: { autosave: false } };
const draftLayer = ({ autosave }: { autosave: boolean }): TargetLayer => ({
  kind: "drafts",
  write: { draft: true, autosave },
  publish: { publishSpecificLocale: LNG, status: "published" },
});

const CASES: { name: string; world: World<unknown>; expected: TargetLayer }[] = [
  { name: "no published layer", world: singleLayer, expected: noDrafts },
  {
    name: "a published layer, autosave off",
    world: layered(false),
    expected: draftLayer({ autosave: false }),
  },
  {
    name: "a published layer, autosave on",
    world: layered(true),
    expected: draftLayer({ autosave: true }),
  },
];

describe("layerOf", () => {
  // `toStrictEqual` pins the exact key set, which is what proves a `no-drafts` layer carries no
  // publish scope: on Payload 3.84.1 `publishSpecificLocale` against a collection with versions
  // but no drafts drops every other locale from the live row — `{en, de}` became `{de}`, silently.
  // That `versions: true` reaches this layer as `single-layer` is pinned in
  // `shared/payload/__tests__/worldOfCollection.test.ts`.
  it.each(CASES)("$name", ({ world, expected }) => {
    expect(layerOf(world, LNG)).toStrictEqual(expected);
  });

  it.each(CASES)("$name — the write layer is the same at any locale", ({ world }) => {
    const de = layerOf(world, "de");
    const pt = layerOf(world, "pt-BR");
    expect(pt.kind).toBe(de.kind);
    expect(pt.write).toStrictEqual(de.write);
  });

  it("scopes publishing to the locale it was given", () => {
    const layer = layerOf(layered(false), "pt-BR");
    expect(layer.kind === "drafts" && layer.publish.publishSpecificLocale).toBe("pt-BR");
  });
});
