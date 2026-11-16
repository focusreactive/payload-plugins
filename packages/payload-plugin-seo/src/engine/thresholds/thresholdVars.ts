import type { MessageVars } from "../../translations/types";
import type { ResolvedSeoThresholds } from "../../types/config";

function isThresholdCheck(
  checkId: string,
  thresholds: ResolvedSeoThresholds
): checkId is keyof ResolvedSeoThresholds {
  return Object.hasOwn(thresholds, checkId);
}

export function thresholdVars(
  checkId: string,
  thresholds: ResolvedSeoThresholds
): MessageVars | undefined {
  return isThresholdCheck(checkId, thresholds) ? thresholds[checkId] : undefined;
}
