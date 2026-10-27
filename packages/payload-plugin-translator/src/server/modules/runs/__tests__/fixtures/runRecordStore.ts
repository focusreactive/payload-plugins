import { vi } from "vitest";
import type { CollectionSlug } from "payload";

import type { RunRecordStore } from "../../RunRecord.store.js";
import type { RunRecord } from "../../RunRecord.types.js";

export type RunRecordStoreDouble = {
  [K in keyof RunRecordStore]: ReturnType<typeof vi.fn>;
};

export const storeDouble = (over: Partial<RunRecordStoreDouble> = {}): RunRecordStoreDouble => ({
  recordQueued: vi.fn().mockResolvedValue(undefined),
  recordStarted: vi.fn().mockResolvedValue(undefined),
  recordSettled: vi.fn().mockResolvedValue(undefined),
  find: vi.fn().mockResolvedValue(null),
  findByDocument: vi.fn().mockResolvedValue([]),
  findByHandles: vi.fn().mockResolvedValue([]),
  findLiveInCollection: vi.fn().mockResolvedValue([]),
  findLiveForDocuments: vi.fn().mockResolvedValue([]),
  findRecentlyFailedInCollection: vi.fn().mockResolvedValue([]),
  deleteByDocument: vi.fn().mockResolvedValue(undefined),
  ...over,
});

export const runRow = (over: Partial<RunRecord> = {}): RunRecord => ({
  handle: "job-1",
  collectionSlug: "posts" as CollectionSlug,
  collectionId: "doc-1",
  sourceLng: "en",
  targetLng: "de",
  filters: null,
  publishOnTranslation: false,
  requesterId: null,
  requesterCollection: null,
  queuedAt: "2026-10-27T10:00:00.000Z",
  startedAt: null,
  settledAt: null,
  outcome: null,
  error: null,
  attempts: null,
  ...over,
});
