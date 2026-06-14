import { ringToStatus, statusToRing } from "../../scoreStatus";
import type { CategoryResult, CheckResult } from "../../types/analysis";

export function toCategory(checks: CheckResult[]): CategoryResult {
  const ringScore = statusToRing(checks);

  return {
    ringScore,
    status: ringToStatus(ringScore),
    checks,
  };
}
