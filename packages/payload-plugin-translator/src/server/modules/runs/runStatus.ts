import type { TaskStatus } from "../task-runner/types.js";

import type { RunRecord } from "./RunRecord.types.js";

export type ReportedRun = {
  row: RunRecord;
  status: TaskStatus;
};

/**
 * What one row means in the vocabulary the panels speak. A cancelled row maps to `null` rather than
 * a word of its own — the admin has no word for it, and `reportedRuns` drops what maps to `null`.
 */
export function statusOf(record: RunRecord): TaskStatus | null {
  if (record.outcome === "cancelled") return null;
  if (record.outcome === "failed") return "failed";
  if (record.outcome === "delivered") return "completed";
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
