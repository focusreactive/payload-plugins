import type { ProvenanceReceipt, ProvenanceStore } from "./ProvenanceStore.interface.js";

export type ReceiptsByDocument = ReadonlyMap<string, ProvenanceReceipt[]>;

const grouped = (receipts: readonly ProvenanceReceipt[]): ReceiptsByDocument => {
  const byDocument = new Map<string, ProvenanceReceipt[]>();
  for (const receipt of receipts) {
    const kept = byDocument.get(receipt.documentId) ?? [];
    kept.push(receipt);
    byDocument.set(receipt.documentId, kept);
  }
  return byDocument;
};

export async function receiptsByDocument(
  store: ProvenanceStore,
  collectionSlug: string,
  documentIds: readonly string[]
): Promise<ReceiptsByDocument> {
  if (documentIds.length === 0) return new Map();

  if (store.findByDocuments) {
    return grouped(await store.findByDocuments(collectionSlug, documentIds));
  }

  const perDocument = await Promise.all(
    documentIds.map(async (id) => await store.findByDocument(collectionSlug, id))
  );
  return grouped(perDocument.flat());
}
