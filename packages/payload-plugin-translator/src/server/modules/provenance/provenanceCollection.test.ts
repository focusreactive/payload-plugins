import { describe, it, expect } from "vitest";
import {
  makeProvenanceCollection,
  isProvenanceCollection,
  DEFAULT_PROVENANCE_SLUG,
} from "./provenanceCollection";

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

  it("carries a marker so plugin wiring can recognise its own collection (idempotent re-runs)", () => {
    expect(makeProvenanceCollection().custom?.translatorProvenance).toBe(true);
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

describe("isProvenanceCollection", () => {
  it("returns false for a collection with no custom field at all", () => {
    expect(isProvenanceCollection({ slug: "posts" } as { custom?: unknown })).toBe(false);
  });

  it("returns false for an empty custom object", () => {
    expect(isProvenanceCollection({ custom: {} })).toBe(false);
  });

  it("returns false for an unrelated custom key", () => {
    expect(isProvenanceCollection({ custom: { someOtherKey: true } })).toBe(false);
  });

  it("returns true when the translatorProvenance marker is true", () => {
    expect(isProvenanceCollection({ custom: { translatorProvenance: true } })).toBe(true);
  });

  it("returns false for a non-boolean truthy marker value", () => {
    expect(isProvenanceCollection({ custom: { translatorProvenance: "true" } })).toBe(false);
  });
});
