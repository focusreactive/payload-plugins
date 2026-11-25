import type { CollectionConfig, Payload } from "payload";
import { describe, expect, it } from "vitest";

import type { World } from "../../../../core/domain/world/index.js";
import { latestOf, worldOfCollection, worldOfRegistered } from "../worldOfCollection.js";
import type { CollectionVersions, VersionRead } from "../worldOfCollection.js";

const LATEST = { draft: true, fallbackLocale: false };
const PUBLISHED = { draft: false, fallbackLocale: false };

const SINGLE_LAYER: { name: string; collection: CollectionVersions }[] = [
  { name: "versions absent", collection: {} },
  { name: "versions: undefined", collection: { versions: undefined } },
  { name: "versions: false", collection: { versions: false } },
  { name: "versions: true", collection: { versions: true } },
  { name: "versions: {}", collection: { versions: {} } },
  { name: "versions: { maxPerDoc }", collection: { versions: { maxPerDoc: 10 } } },
  { name: "drafts: false", collection: { versions: { drafts: false } } },
  {
    name: "registered, drafts: false",
    collection: { versions: { drafts: false, maxPerDoc: 100 } },
  },
];

const LAYERED: { name: string; collection: CollectionVersions; autosave: boolean }[] = [
  { name: "drafts: true", collection: { versions: { drafts: true } }, autosave: false },
  { name: "drafts: {}", collection: { versions: { drafts: {} } }, autosave: false },
  {
    name: "drafts: { autosave: false }",
    collection: { versions: { drafts: { autosave: false } } },
    autosave: false,
  },
  {
    name: "drafts: { autosave: true }",
    collection: { versions: { drafts: { autosave: true } } },
    autosave: true,
  },
  {
    name: "drafts: { autosave: {} }",
    collection: { versions: { drafts: { autosave: {} } } },
    autosave: true,
  },
  {
    name: "drafts: { autosave: { interval: 800 } }",
    collection: { versions: { drafts: { autosave: { interval: 800 } } } },
    autosave: true,
  },
  {
    name: "registered, drafts without autosave",
    collection: {
      versions: {
        drafts: { autosave: false, localizeStatus: false, schedulePublish: false, validate: false },
        maxPerDoc: 100,
      },
    },
    autosave: false,
  },
];

const EVERY_SHAPE = [...SINGLE_LAYER, ...LAYERED];

const autosaveOf = (world: World<VersionRead>) =>
  world.kind === "layered" ? world.autosave : undefined;
const publishedOf = (world: World<VersionRead>) =>
  world.kind === "layered" ? world.read.published : undefined;

describe("every shape the host's versions setting can take", () => {
  it.each(EVERY_SHAPE)("$name is answered, not thrown on", ({ collection }) => {
    expect(() => worldOfCollection(collection)).not.toThrow();
  });

  it.each(SINGLE_LAYER)("$name is a single-layer world", ({ collection }) => {
    expect(worldOfCollection(collection).kind).toBe("single-layer");
  });

  it.each(LAYERED)("$name is a layered world", ({ collection }) => {
    expect(worldOfCollection(collection).kind).toBe("layered");
  });

  it.each(LAYERED)("$name carries autosave: $autosave", ({ collection, autosave }) => {
    expect(autosaveOf(worldOfCollection(collection))).toBe(autosave);
  });
});

describe("the arguments each read hands the CMS", () => {
  it.each(LAYERED)("$name: latest asks for the draft, in that locale alone", ({ collection }) => {
    expect(worldOfCollection(collection).read.latest).toStrictEqual(LATEST);
  });

  it.each(SINGLE_LAYER)(
    "$name: latest asks the same, since the CMS ignores a draft ask without drafts",
    ({ collection }) => {
      expect(worldOfCollection(collection).read.latest).toStrictEqual(LATEST);
    }
  );

  it.each(LAYERED)(
    "$name: published asks for the published version, in that locale alone",
    ({ collection }) => {
      expect(publishedOf(worldOfCollection(collection))).toStrictEqual(PUBLISHED);
    }
  );
});

describe("a world is derived afresh on every call", () => {
  it("answers from the config as it stands now, not as it stood at the last call", () => {
    const collection: { versions?: CollectionConfig["versions"] } = { versions: { drafts: true } };
    const before = worldOfCollection(collection).kind;
    collection.versions = false;

    expect([before, worldOfCollection(collection).kind]).toStrictEqual(["layered", "single-layer"]);
  });
});

describe("a slug the host never registered", () => {
  const withoutCollections = { collections: {} } as unknown as Payload;

  it("answers as a world with no published layer, rather than throwing", () => {
    expect(worldOfRegistered(withoutCollections, "absent").kind).toBe("single-layer");
  });

  it("still reads the latest, so a read on an unknown slug fails on the slug and not on us", () => {
    expect(latestOf(withoutCollections, "absent")).toStrictEqual(LATEST);
  });
});
