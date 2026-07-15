import { describe, it, expect } from "vitest";
import {
  makeProvenanceCollection,
  isProvenanceCollection,
  ensureProvenanceCollectionRegistered,
  DEFAULT_PROVENANCE_SLUG,
} from "./Provenance.collection";
import type { ManagedCollectionsConfig } from "./Provenance.shapes";

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

describe("ensureProvenanceCollectionRegistered", () => {
  // Narrow input — a plain literal, no Config mock needed (the testability win of the reshape).
  it("adds the sidecar collection when it is absent", () => {
    const host: ManagedCollectionsConfig = { collections: [{ slug: "posts" }] };
    ensureProvenanceCollectionRegistered(host, "translator-provenance");
    expect(host.collections).toHaveLength(2);
    const sidecar = host.collections![1];
    expect(sidecar.slug).toBe("translator-provenance");
    expect(isProvenanceCollection(sidecar)).toBe(true);
  });

  it("is idempotent — a second call does not stack a duplicate", () => {
    const host: ManagedCollectionsConfig = { collections: [{ slug: "posts" }] };
    ensureProvenanceCollectionRegistered(host, "translator-provenance");
    ensureProvenanceCollectionRegistered(host, "translator-provenance");
    expect(host.collections).toHaveLength(2);
  });

  it("initialises collections when the host has none", () => {
    const host: ManagedCollectionsConfig = {};
    ensureProvenanceCollectionRegistered(host, "translator-provenance");
    expect(host.collections).toHaveLength(1);
  });

  it("honours a custom slug", () => {
    const host: ManagedCollectionsConfig = {};
    ensureProvenanceCollectionRegistered(host, "my-provenance");
    expect(host.collections![0].slug).toBe("my-provenance");
  });
});
