import type { CollectionSlug } from "payload";

import type { ID, JobHandle } from "../task-runner/types.js";

export type RunOutcome = "delivered" | "failed" | "cancelled";

export type RunIdentity = {
  handle: JobHandle;
  collectionSlug: CollectionSlug;
  collectionId: ID;
  sourceLng: string;
  targetLng: string;
  filters: string | null;
  publishOnTranslation: boolean;
  requesterId: string | null;
  requesterCollection: string | null;
  queuedAt: string;
};

export type RunProgress = {
  startedAt: string | null;
  settledAt: string | null;
  outcome: RunOutcome | null;
  error: string | null;
  attempts: number | null;
};

export type RunRecord = RunIdentity & RunProgress;

export type RunRecordKey = Pick<RunRecord, "handle" | "targetLng">;

export type RunDocument = Pick<RunRecord, "collectionSlug" | "collectionId">;

export type RunStart = {
  startedAt: string;
  attempts: number;
};

/**
 * What became of one locale, and when the plugin was told — `TaskEvent` carries no timestamp of its
 * own, so `settledAt` is the telling, not the happening.
 */
export type RunSettlement = {
  settledAt: string;
  outcome: RunOutcome;
  error: string | null;
};
