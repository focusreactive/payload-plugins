import type { CollectionSlug, Payload, Where } from "payload";
import type {
  ProvenanceKey,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "../../../core/provenance";

interface ProvenanceDoc extends Record<string, unknown> {
  id: string | number;
}

function keyWhere(key: ProvenanceKey): Where {
  return {
    and: [
      { collectionSlug: { equals: key.collectionSlug } },
      { documentId: { equals: key.documentId } },
      { targetLocale: { equals: key.targetLocale } },
    ],
  };
}

function toRecord(doc: ProvenanceDoc): TranslationProvenanceRecord {
  return {
    collectionSlug: String(doc.collectionSlug),
    documentId: String(doc.documentId),
    targetLocale: String(doc.targetLocale),
    sourceLocale: String(doc.sourceLocale),
    sourceFingerprint: String(doc.sourceFingerprint),
    // `translatedAt` is backed by a `date` field, which Payload may hand back as a Date; normalize to
    // ISO-8601 so the stored contract holds and #50's fingerprint comparison stays format-stable.
    translatedAt: new Date(doc.translatedAt as string | number | Date).toISOString(),
    dismissedFingerprint:
      doc.dismissedFingerprint == null ? null : String(doc.dismissedFingerprint),
  };
}

/**
 * Payload-backed {@link ProvenanceStore}. All Payload coupling for provenance lives here; the core
 * knows only the port. Records are keyed by `(collectionSlug, documentId, targetLocale)`; `upsert`
 * matches on that key so a re-translation updates the row in place instead of duplicating it.
 *
 * The sidecar holds custom fields that no generated collection type describes, so the slug is cast to
 * `CollectionSlug` once; the record shape is guaranteed by {@link makeProvenanceCollection}.
 */
export class PayloadProvenanceStore implements ProvenanceStore {
  private readonly payload: Payload;
  private readonly collection: CollectionSlug;

  constructor(payload: Payload, slug: string) {
    this.payload = payload;
    this.collection = slug as CollectionSlug;
  }

  async upsert(record: TranslationProvenanceRecord): Promise<void> {
    const existing = await this.findDoc(record);
    if (existing === null) {
      await this.payload.create({ collection: this.collection, data: record });
    } else {
      await this.payload.update({ collection: this.collection, id: existing.id, data: record });
    }
  }

  async find(key: ProvenanceKey): Promise<TranslationProvenanceRecord | null> {
    const doc = await this.findDoc(key);
    return doc === null ? null : toRecord(doc);
  }

  async deleteByDocument(collectionSlug: string, documentId: string): Promise<void> {
    await this.payload.delete({
      collection: this.collection,
      where: {
        and: [
          { collectionSlug: { equals: collectionSlug } },
          { documentId: { equals: documentId } },
        ],
      },
    });
  }

  private async findDoc(key: ProvenanceKey): Promise<ProvenanceDoc | null> {
    const result = await this.payload.find({
      collection: this.collection,
      where: keyWhere(key),
      limit: 1,
      depth: 0,
      pagination: false,
    });
    return (result.docs[0] as ProvenanceDoc | undefined) ?? null;
  }
}
