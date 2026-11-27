import type { RunAssignment } from "../task-runner/types.js";

import type { RunRecord } from "./RunRecord.types.js";

function requesterOf(row: RunRecord): RunAssignment["startedBy"] {
  if (row.requesterId === null || row.requesterCollection === null) return null;
  return { id: row.requesterId, collection: row.requesterCollection };
}

/**
 * One entry per handle: a run's rows differ only by locale, so whichever row lands last answers for
 * the run.
 */
export function assignmentsFromRows(rows: readonly RunRecord[]): RunAssignment[] {
  const byHandle = new Map<string, RunAssignment>();
  for (const row of rows) {
    byHandle.set(row.handle, {
      handle: row.handle,
      collectionSlug: row.collectionSlug,
      collectionId: row.collectionId,
      startedBy: requesterOf(row),
    });
  }
  return [...byHandle.values()];
}
