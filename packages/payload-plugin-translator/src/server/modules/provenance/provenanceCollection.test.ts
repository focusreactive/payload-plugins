import { describe, it, expect } from "vitest";
import { makeProvenanceCollection, DEFAULT_PROVENANCE_SLUG } from "./provenanceCollection";

describe("makeProvenanceCollection", () => {
  it("defaults to the translator-provenance slug", () => {
    expect(DEFAULT_PROVENANCE_SLUG).toBe("translator-provenance");
    expect(makeProvenanceCollection().slug).toBe("translator-provenance");
  });

  it("honours a slug override", () => {
    expect(makeProvenanceCollection("custom-provenance").slug).toBe("custom-provenance");
  });

  it("is hidden from the admin UI", () => {
    expect(makeProvenanceCollection().admin?.hidden).toBe(true);
  });

  it("declares all provenance fields with portable types", () => {
    const collection = makeProvenanceCollection();
    const byName = new Map(
      collection.fields
        .filter((f): f is typeof f & { name: string } => "name" in f)
        .map((f) => [f.name, f.type])
    );
    expect(byName.get("collectionSlug")).toBe("text");
    expect(byName.get("documentId")).toBe("text");
    expect(byName.get("targetLocale")).toBe("text");
    expect(byName.get("sourceLocale")).toBe("text");
    expect(byName.get("sourceFingerprint")).toBe("text");
    expect(byName.get("translatedAt")).toBe("date");
    expect(byName.get("dismissedFingerprint")).toBe("text");
  });

  it("has a composite unique index on the upsert key", () => {
    const collection = makeProvenanceCollection();
    const composite = collection.indexes?.find(
      (idx) => idx.fields.length === 3 && idx.fields.includes("collectionSlug")
    );
    expect(composite).toBeDefined();
    expect(composite?.fields).toEqual(["collectionSlug", "documentId", "targetLocale"]);
    expect(composite?.unique).toBe(true);
  });
});
