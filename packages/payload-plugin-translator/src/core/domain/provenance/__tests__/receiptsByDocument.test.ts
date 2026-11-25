import { describe, expect, it, vi } from "vitest";

import type { ProvenanceReceipt, ProvenanceStore } from "../ProvenanceStore.interface.js";
import { receiptsByDocument } from "../receiptsByDocument.js";

const receipt = (documentId: string, targetLocale: string): ProvenanceReceipt => ({
  collectionSlug: "posts",
  documentId,
  targetLocale,
  sourceLocale: "en",
  sourceFingerprint: null,
  translatedAt: "2026-11-01T09:00:00.000Z",
});

const storeHolding = (receipts: ProvenanceReceipt[], batched: boolean) => {
  const findByDocument = vi.fn(async (_slug: string, id: string) =>
    receipts.filter((one) => one.documentId === id)
  );
  const findByDocuments = vi.fn(async (_slug: string, ids: readonly string[]) =>
    receipts.filter((one) => ids.includes(one.documentId))
  );
  const store = {
    findByDocument,
    ...(batched ? { findByDocuments } : {}),
  } as unknown as ProvenanceStore;
  return { store, findByDocument, findByDocuments };
};

const held = [receipt("a", "de"), receipt("a", "fr"), receipt("b", "de")];

describe("the records of a page of documents", () => {
  it("costs one read where the store can answer for several documents", async () => {
    const { store, findByDocuments, findByDocument } = storeHolding(held, true);

    const found = await receiptsByDocument(store, "posts", ["a", "b", "c"]);

    expect(findByDocuments).toHaveBeenCalledTimes(1);
    expect(findByDocument).not.toHaveBeenCalled();
    expect([...found.keys()].sort()).toStrictEqual(["a", "b"]);
    expect(found.get("a")?.map((one) => one.targetLocale)).toStrictEqual(["de", "fr"]);
  });

  it("falls back to one read per document where the store has no batched method", async () => {
    const { store, findByDocument } = storeHolding(held, false);

    const found = await receiptsByDocument(store, "posts", ["a", "b"]);

    expect(findByDocument).toHaveBeenCalledTimes(2);
    expect(found.get("b")?.length).toBe(1);
  });

  it("asks nothing where no document was asked about", async () => {
    const { store, findByDocument, findByDocuments } = storeHolding(held, true);

    expect([...(await receiptsByDocument(store, "posts", [])).keys()]).toStrictEqual([]);
    expect(findByDocument).not.toHaveBeenCalled();
    expect(findByDocuments).not.toHaveBeenCalled();
  });

  it("says nothing about a document that has no record", async () => {
    const { store } = storeHolding(held, true);

    expect((await receiptsByDocument(store, "posts", ["c"])).get("c")).toBeUndefined();
  });
});
