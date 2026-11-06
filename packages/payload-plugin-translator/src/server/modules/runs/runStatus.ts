import type { TaskStatus } from "../task-runner/types.js";

import type { RunOutcome, RunRecord } from "./RunRecord.types.js";

export type ReportedRun = {
  row: RunRecord;
  status: TaskStatus;
};

/** A cancelled row has no word in the panels' vocabulary, so it maps to `null`. */
const SETTLED_STATUS: Record<RunOutcome, TaskStatus | null> = {
  delivered: "completed",
  failed: "failed",
  abandoned: "abandoned",
  cancelled: null,
};

export function statusOf(record: RunRecord): TaskStatus | null {
  const settled = record.outcome === null ? undefined : SETTLED_STATUS[record.outcome];
  if (settled !== undefined) return settled;
  return record.startedAt === null ? "pending" : "running";
}

export function reportedRuns(rows: readonly RunRecord[]): ReportedRun[] {
  const reported: ReportedRun[] = [];
  for (const row of rows) {
    const status = statusOf(row);
    if (status !== null) reported.push({ row, status });
  }
  return reported;
}

export const lastTouched = (record: RunRecord): string =>
  record.settledAt ?? record.startedAt ?? record.queuedAt;
