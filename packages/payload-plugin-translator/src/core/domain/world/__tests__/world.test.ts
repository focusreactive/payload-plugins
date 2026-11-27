import { describe, expect, it } from "vitest";

import { resolveWorld } from "../world.js";
import type { HostVersionSwitches, World, WorldKind } from "../world.js";

const READS = { latest: "the latest read", published: "the published read" };

const EVERY_KIND_THE_TYPE_ALLOWS: Record<WorldKind, true> = {
  layered: true,
  "single-layer": true,
};

const SWITCHES: { switches: HostVersionSwitches; kind: WorldKind }[] = [
  { switches: { drafts: true, autosave: false }, kind: "layered" },
  { switches: { drafts: true, autosave: true }, kind: "layered" },
  { switches: { drafts: false, autosave: false }, kind: "single-layer" },
  { switches: { drafts: false, autosave: true }, kind: "single-layer" },
];

const worldOf = (switches: HostVersionSwitches) => resolveWorld(switches, READS);
const autosaveOf = (world: World<string>) =>
  world.kind === "layered" ? world.autosave : undefined;
const publishedOf = (world: World<string>) =>
  world.kind === "layered" ? world.read.published : undefined;

describe("which world a collection is in", () => {
  it.each(SWITCHES)(
    "drafts: $switches.drafts, autosave: $switches.autosave → $kind",
    ({ switches, kind }) => {
      expect(worldOf(switches).kind).toBe(kind);
    }
  );

  it.each([true, false])("a layered world carries autosave: %s as given", (autosave) => {
    expect(autosaveOf(worldOf({ drafts: true, autosave }))).toBe(autosave);
  });
});

describe("the reads a world keeps", () => {
  it.each([true, false])(
    "a layered world answers latest with the latest read (autosave: %s)",
    (autosave) => {
      expect(worldOf({ drafts: true, autosave }).read.latest).toBe(READS.latest);
    }
  );

  it.each([true, false])(
    "a layered world answers published with the published read (autosave: %s)",
    (autosave) => {
      expect(publishedOf(worldOf({ drafts: true, autosave }))).toBe(READS.published);
    }
  );

  it.each([true, false])(
    "a single-layer world answers latest with the latest read (autosave: %s)",
    (autosave) => {
      expect(worldOf({ drafts: false, autosave }).read.latest).toBe(READS.latest);
    }
  );

  it.each([true, false])(
    "a single-layer world keeps only the latest read (autosave: %s)",
    (autosave) => {
      expect(Object.keys(worldOf({ drafts: false, autosave }).read)).toStrictEqual(["latest"]);
    }
  );
});

describe("the worlds the resolver can produce", () => {
  it("produces every kind the type allows, each from some host configuration", () => {
    const produced = [...new Set(SWITCHES.map(({ switches }) => worldOf(switches).kind))].sort();

    expect(produced).toStrictEqual(Object.keys(EVERY_KIND_THE_TYPE_ALLOWS).sort());
  });
});
