import type { CheckResult, Status } from "../engine/types/analysis";

const URGENCY: Record<Status, number> = { bad: 0, warn: 1, good: 2 };

export function orderByUrgency(checks: CheckResult[]): CheckResult[] {
  return [...checks].sort((a, b) => URGENCY[a.status] - URGENCY[b.status]);
}
