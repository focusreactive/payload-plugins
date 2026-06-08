import { describe, it, expect } from "vitest";
import type { CollectionSlug } from "payload";
import { readCollectionRef } from "./readCollectionRef";
import type { PayloadJob } from "./types";

describe("readCollectionRef", () => {
  describe("new flat-text shape", () => {
    it("reads collection_slug and collection_id from the new shape", () => {
      const input: PayloadJob["input"] = {
        collection_slug: "posts",
        collection_id: "doc-123",
        source_lng: "en",
        target_lng: "de",
      };
      const ref = readCollectionRef(input);
      expect(ref.collectionSlug).toBe("posts");
      expect(ref.collectionId).toBe("doc-123");
    });
  });

  describe("legacy relationship shape", () => {
    it("falls back to collection.relationTo / collection.value, coercing numeric id to string", () => {
      const input: PayloadJob["input"] = {
        collection: { relationTo: "posts" as CollectionSlug, value: 5 },
        source_lng: "en",
        target_lng: "de",
      };
      const ref = readCollectionRef(input);
      expect(ref.collectionSlug).toBe("posts");
      expect(ref.collectionId).toBe("5");
    });
  });

  describe("new shape present alongside legacy", () => {
    it("prefers new shape over legacy when both are present", () => {
      const input: PayloadJob["input"] = {
        collection_slug: "pages",
        collection_id: "new-id",
        collection: {
          relationTo: "posts" as CollectionSlug,
          value: "legacy-id",
        },
        source_lng: "en",
        target_lng: "de",
      };
      const ref = readCollectionRef(input);
      expect(ref.collectionSlug).toBe("pages");
      expect(ref.collectionId).toBe("new-id");
    });
  });

  describe("input undefined", () => {
    it("returns empty strings gracefully when input is undefined", () => {
      const ref = readCollectionRef(undefined);
      expect(ref.collectionSlug).toBe("");
      expect(ref.collectionId).toBe("");
    });
  });
});
