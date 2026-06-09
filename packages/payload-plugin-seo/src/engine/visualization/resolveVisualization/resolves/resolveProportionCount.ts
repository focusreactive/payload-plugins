import type { CheckResult } from "../../../types/analysis";
import type { Visualization } from "../../../types/visualization";
import { readNumber } from "../utils/readNumber";
import { PRESENCE } from "./resolvePresence";

export const resolveProportionCount = (check: CheckResult, data: Record<string, unknown> | undefined, forceWarn: boolean): Visualization => {
  const total = readNumber(data, "total");
  if (total == null) return PRESENCE;

  const matched = readNumber(data, "matched") ?? 0;

  return {
    type: "proportion",
    segment: {
      countLabel: `${matched} / ${total}`,
      filledPct: total ? (matched / total) * 100 : 0,
      filledStatus: forceWarn ? "warn" : check.status === "good" ? "good" : "warn",
    },
  };
};
