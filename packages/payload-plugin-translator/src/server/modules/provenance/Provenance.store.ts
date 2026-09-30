import type { CollectionSlug, Payload, Where } from "payload";

import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";
import type {
  ProvenanceKey,
  ProvenanceStore,
  TranslationProvenanceRecord,
} from "../../../core/domain/provenance/index.js";

/** Builds a provenance store bound to a Payload instance; absent when provenance is disabled. */
export type ProvenanceStoreFactory = (payload: Payload, scope?: RequestScope) => ProvenanceStore;

interface ProvenanceDoc extends Record<string, unknown> {
  id: string | number;
}

function documentWhere(collectionSlug: string, documentId: string): Where {
  return {
    and: [{ collectionSlug: { equals: collectionSlug } }, { documentId: { equals: documentId } }],
  };
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
  private readonly scope: RequestScope;

  constructor(payload: Payload, slug: string, scope: RequestScope = {}) {
    this.payload = payload;
    this.collection = slug as CollectionSlug;
    this.scope = scope;
  }

  private req(): { transactionID?: string | number } {
    return freshReq(this.scope);
  }

  async upsert(record: TranslationProvenanceRecord): Promise<void> {
    const existing = await this.findDoc(record);
    if (existing === null) {
      try {
        await this.payload.create({ req: this.req(), collection: this.collection, data: record });
      } catch (error) {
        const raceWinner = await this.findDoc(record);
        if (raceWinner === null) throw error;
        await this.payload.update({
          req: this.req(),
          collection: this.collection,
          id: raceWinner.id,
          data: record,
        });
      }
    } else {
      await this.payload.update({
        req: this.req(),
        collection: this.collection,
        id: existing.id,
        data: record,
      });
    }
  }

  async find(key: ProvenanceKey): Promise<TranslationProvenanceRecord | null> {
    const doc = await this.findDoc(key);
    return doc === null ? null : toRecord(doc);
  }

  async findByDocument(
    collectionSlug: string,
    documentId: string
  ): Promise<TranslationProvenanceRecord[]> {
    const result = await this.payload.find({
      req: this.req(),
      collection: this.collection,
      where: documentWhere(collectionSlug, documentId),
      depth: 0,
      pagination: false,
    });
    return (result.docs as ProvenanceDoc[]).map(toRecord);
  }

  async dismiss(key: ProvenanceKey, dismissedFingerprint: string): Promise<void> {
    const existing = await this.findDoc(key);
    if (existing === null) return;
    await this.payload.update({
      req: this.req(),
      collection: this.collection,
      id: existing.id,
      data: { dismissedFingerprint },
    });
  }

  /**
   * Deliberately outside the caller's transaction, unlike every other write here: a failed sidecar
   * delete must never roll back the document delete that triggered it.
   */
  async deleteByDocument(collectionSlug: string, documentId: string): Promise<void> {
    await this.payload.delete({
      collection: this.collection,
      where: documentWhere(collectionSlug, documentId),
    });
  }

  private async findDoc(key: ProvenanceKey): Promise<ProvenanceDoc | null> {
    const result = await this.payload.find({
      req: this.req(),
      collection: this.collection,
      where: keyWhere(key),
      limit: 1,
      depth: 0,
      pagination: false,
    });
    return (result.docs[0] as ProvenanceDoc | undefined) ?? null;
  }
}
