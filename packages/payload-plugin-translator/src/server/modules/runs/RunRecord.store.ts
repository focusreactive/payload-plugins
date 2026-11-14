import type { CollectionSlug, Payload, Where } from "payload";

import type { ID, JobHandle } from "../task-runner/types.js";

import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { freshReq } from "../../shared/payload/RequestScope.shapes.js";

import type {
  RunDocument,
  RunIdentity,
  RunOutcome,
  RunRecord,
  RunRecordKey,
  RunSettlement,
  RunStart,
} from "./RunRecord.types.js";

export type RunRecordStoreFactory = (payload: Payload, scope?: RequestScope) => RunRecordStore;

export interface RunRecordStore {
  /**
   * Record that this locale is queued. A key already recorded keeps its row — unless that row is
   * about a different document, which means the handle was reused and the old row is overwritten.
   */
  recordQueued(identity: RunIdentity): Promise<void>;
  /** A row that is not there is not created. */
  recordStarted(key: RunRecordKey, start: RunStart): Promise<void>;
  /**
   * Close the row. A row that is not there is not created, and the later settlement wins: a locale
   * cancelled while its work was in flight still records what the work did.
   */
  recordSettled(key: RunRecordKey, settlement: RunSettlement): Promise<void>;
  find(key: RunRecordKey): Promise<RunRecord | null>;
  findByDocument(document: RunDocument): Promise<RunRecord[]>;
  findByHandles(handles: readonly JobHandle[]): Promise<RunRecord[]>;
  /** Live means queued or running: `settledAt` is empty. */
  findLiveInCollection(collectionSlug: CollectionSlug): Promise<RunRecord[]>;
  findLiveForDocuments(collectionSlug: CollectionSlug, ids: readonly ID[]): Promise<RunRecord[]>;
  findRecentlyFailedInCollection(collectionSlug: CollectionSlug, since: Date): Promise<RunRecord[]>;
  deleteByDocument(document: RunDocument): Promise<void>;
}

/**
 * Nothing prunes this table, so every read states its own ceiling — and a read that would answer
 * with more rows is truncated silently, not reported.
 */
const MOST_ROWS_ONE_READ_ANSWERS = 500;

const noProgressYet = {
  startedAt: null,
  settledAt: null,
  outcome: null,
  error: null,
  attempts: null,
};

interface RunRecordDoc extends Record<string, unknown> {
  id: string | number;
}

function keyWhere(key: RunRecordKey): Where {
  return {
    and: [{ handle: { equals: key.handle } }, { targetLng: { equals: key.targetLng } }],
  };
}

const isAbout = (row: RunRecordDoc, identity: RunIdentity): boolean =>
  String(row.collectionSlug) === identity.collectionSlug &&
  String(row.collectionId) === identity.collectionId;

function documentWhere(document: RunDocument): Where {
  return {
    and: [
      { collectionSlug: { equals: document.collectionSlug } },
      { collectionId: { equals: document.collectionId } },
    ],
  };
}

const text = (value: unknown): string | null => (value == null ? null : String(value));

const moment = (value: unknown): string | null =>
  value == null ? null : new Date(value as string | number | Date).toISOString();

function toRecord(doc: RunRecordDoc): RunRecord {
  return {
    handle: String(doc.handle),
    collectionSlug: String(doc.collectionSlug) as CollectionSlug,
    collectionId: String(doc.collectionId),
    sourceLng: String(doc.sourceLng),
    targetLng: String(doc.targetLng),
    filters: text(doc.filters),
    publishOnTranslation: doc.publishOnTranslation === true,
    requesterId: text(doc.requesterId),
    requesterCollection: text(doc.requesterCollection),
    queuedAt: moment(doc.queuedAt) ?? new Date(0).toISOString(),
    startedAt: moment(doc.startedAt),
    settledAt: moment(doc.settledAt),
    outcome: text(doc.outcome) as RunOutcome | null,
    error: text(doc.error),
    attempts: doc.attempts == null ? null : Number(doc.attempts),
  };
}

/**
 * Payload-backed store for the run record. The collection is built at config time, so no generated
 * type names it — hence the one `CollectionSlug` cast; {@link makeRunRecordCollection} is what makes
 * the shape true.
 */
export class PayloadRunRecordStore implements RunRecordStore {
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

  async recordQueued(identity: RunIdentity): Promise<void> {
    const existing = await this.findDoc(identity);
    if (existing !== null) {
      if (isAbout(existing, identity)) return;
      // A SQL store reissues a deleted job's id, so a handle can come round again naming a different
      // document; the row found here belongs to a run that no longer exists.
      await this.payload.update({
        req: this.req(),
        collection: this.collection,
        id: existing.id,
        data: { ...identity, ...noProgressYet },
      });
      return;
    }

    try {
      await this.payload.create({
        req: this.req(),
        collection: this.collection,
        data: { ...identity, ...noProgressYet },
      });
    } catch (error) {
      await this.ignoreIfTheRowIsNowThere(error, identity);
    }
  }

  recordStarted(key: RunRecordKey, start: RunStart): Promise<void> {
    return this.patch(key, start);
  }

  recordSettled(key: RunRecordKey, settlement: RunSettlement): Promise<void> {
    return this.patch(key, settlement);
  }

  async find(key: RunRecordKey): Promise<RunRecord | null> {
    const doc = await this.findDoc(key);
    return doc === null ? null : toRecord(doc);
  }

  findByDocument(document: RunDocument): Promise<RunRecord[]> {
    return this.rows(documentWhere(document));
  }

  async findByHandles(handles: readonly JobHandle[]): Promise<RunRecord[]> {
    if (handles.length === 0) return [];
    return await this.rows({ handle: { in: [...handles] } });
  }

  findLiveInCollection(collectionSlug: CollectionSlug): Promise<RunRecord[]> {
    return this.rows({
      and: [{ collectionSlug: { equals: collectionSlug } }, { settledAt: { exists: false } }],
    });
  }

  async findLiveForDocuments(
    collectionSlug: CollectionSlug,
    ids: readonly ID[]
  ): Promise<RunRecord[]> {
    if (ids.length === 0) return [];
    return await this.rows({
      and: [
        { collectionSlug: { equals: collectionSlug } },
        { collectionId: { in: [...ids] } },
        { settledAt: { exists: false } },
      ],
    });
  }

  findRecentlyFailedInCollection(
    collectionSlug: CollectionSlug,
    since: Date
  ): Promise<RunRecord[]> {
    return this.rows({
      and: [
        { collectionSlug: { equals: collectionSlug } },
        { outcome: { equals: "failed" } },
        { settledAt: { greater_than: since.toISOString() } },
      ],
    });
  }

  /**
   * Deliberately outside the caller's transaction: this runs from the host's own `afterDelete`, and
   * a failed cleanup must never roll back the document delete that triggered it.
   */
  async deleteByDocument(document: RunDocument): Promise<void> {
    await this.payload.delete({
      collection: this.collection,
      where: documentWhere(document),
    });
  }

  private async rows(where: Where): Promise<RunRecord[]> {
    const result = await this.payload.find({
      req: this.req(),
      collection: this.collection,
      where,
      depth: 0,
      limit: MOST_ROWS_ONE_READ_ANSWERS,
      sort: "-queuedAt",
    });
    return (result.docs as RunRecordDoc[]).map(toRecord);
  }

  private async patch(key: RunRecordKey, data: Record<string, unknown>): Promise<void> {
    await this.payload.update({
      req: this.req(),
      collection: this.collection,
      where: keyWhere(key),
      data,
    });
  }

  private async ignoreIfTheRowIsNowThere(error: unknown, key: RunRecordKey): Promise<void> {
    if ((await this.findDoc(key)) === null) throw error;
  }

  private async findDoc(key: RunRecordKey): Promise<RunRecordDoc | null> {
    const result = await this.payload.find({
      req: this.req(),
      collection: this.collection,
      where: keyWhere(key),
      limit: 1,
      depth: 0,
      pagination: false,
    });
    return (result.docs[0] as RunRecordDoc | undefined) ?? null;
  }
}
