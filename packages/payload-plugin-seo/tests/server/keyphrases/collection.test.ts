import { describe, expect, it } from "vitest";
import { KEYPHRASES_COLLECTION_SLUG } from "../../../src/constants";
import { createKeyphraseCollection } from "../../../src/server/keyphrases/collection";

const collection = createKeyphraseCollection();

describe("createKeyphraseCollection", () => {
  it("is hidden in the admin and from GraphQL", () => {
    expect(collection.slug).toBe(KEYPHRASES_COLLECTION_SLUG);
    expect(collection.admin?.hidden).toBe(true);
    expect(collection.graphQL).toBe(false);
  });

  it("keeps one row per document and locale", () => {
    expect(collection.indexes).toEqual([
      { fields: ["docCollection", "docId", "locale"], unique: true },
    ]);
  });

  it("stores keyphrases as json and their intents as indexed text", () => {
    const byName = Object.fromEntries(
      collection.fields.map((f) => [(f as { name: string }).name, f as Record<string, unknown>])
    );
    for (const name of ["docCollection", "docId", "locale"]) {
      expect(byName[name]).toMatchObject({ type: "text", required: true });
    }
    expect(byName.keyphrases).toMatchObject({ type: "json", required: true });
    expect(byName.intents).toMatchObject({ type: "text", hasMany: true, index: true });
  });

  it("denies every operation through the collection APIs", () => {
    for (const op of ["read", "create", "update", "delete"] as const) {
      const access = collection.access?.[op] as (args: { req: { user?: unknown } }) => boolean;
      expect(access({ req: {} })).toBe(false);
      expect(access({ req: { user: { id: 1 } } })).toBe(false);
    }
  });
});
