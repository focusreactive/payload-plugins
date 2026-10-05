import type { CollectionSlug, Payload, Where } from "payload";

import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";
import type {
  ProvenanceKey,
  ProvenanceStore,
  SourceFingerprint,
  ProvenanceReceipt,
} from "../../../core/domain/provenance/index.js";
import {
  parseSourceFingerprint,
  serializeSourceFingerprint,
} from "../../../core/domain/provenance/index.js";

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

const readFingerprint = (stored: unknown): SourceFingerprint | null =>
  parseSourceFingerprint(stored == null ? null : String(stored));

/** The only place stored text becomes a {@link SourceFingerprint}. */
function toRecord(doc: ProvenanceDoc): ProvenanceReceipt {
  return {
    collectionSlug: String(doc.collectionSlug),
    documentId: String(doc.documentId),
    targetLocale: String(doc.targetLocale),
    sourceLocale: String(doc.sourceLocale),
    sourceFingerprint: readFingerprint(doc.sourceFingerprint),
    translatedAt: new Date(doc.translatedAt as string | number | Date).toISOString(),
    dismissedFingerprint: readFingerprint(doc.dismissedFingerprint),
  };
}

function toStoredData(record: ProvenanceReceipt): Record<string, unknown> {
  return {
    ...record,
    sourceFingerprint:
      record.sourceFingerprint === null
        ? null
        : serializeSourceFingerprint(record.sourceFingerprint),
    dismissedFingerprint:
      record.dismissedFingerprint === null
        ? null
        : serializeSourceFingerprint(record.dismissedFingerprint),
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

  async upsert(record: ProvenanceReceipt): Promise<void> {
    const data = toStoredData(record);
    const existing = await this.findDoc(record);
    if (existing === null) {
      try {
        await this.payload.create({ req: this.req(), collection: this.collection, data });
      } catch (error) {
        const raceWinner = await this.findDoc(record);
        if (raceWinner === null) throw error;
        await this.payload.update({
          req: this.req(),
          collection: this.collection,
          id: raceWinner.id,
          data,
        });
      }
    } else {
      await this.payload.update({
        req: this.req(),
        collection: this.collection,
        id: existing.id,
        data,
      });
    }
  }

  async find(key: ProvenanceKey): Promise<ProvenanceReceipt | null> {
    const doc = await this.findDoc(key);
    return doc === null ? null : toRecord(doc);
  }

  async findByDocument(collectionSlug: string, documentId: string): Promise<ProvenanceReceipt[]> {
    const result = await this.payload.find({
      req: this.req(),
      collection: this.collection,
      where: documentWhere(collectionSlug, documentId),
      depth: 0,
      pagination: false,
    });
    return (result.docs as ProvenanceDoc[]).map(toRecord);
  }

  async dismiss(key: ProvenanceKey, dismissedFingerprint: SourceFingerprint): Promise<void> {
    const existing = await this.findDoc(key);
    if (existing === null) return;
    await this.payload.update({
      req: this.req(),
      collection: this.collection,
      id: existing.id,
      data: { dismissedFingerprint: serializeSourceFingerprint(dismissedFingerprint) },
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
