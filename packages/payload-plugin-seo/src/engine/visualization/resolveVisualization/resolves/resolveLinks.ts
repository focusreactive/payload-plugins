import type { CheckResult } from "../../../types/analysis";
import type { Visualization } from "../../../types/visualization";
import { readNumber } from "../utils/readNumber";
import { PRESENCE } from "./resolvePresence";

export const resolveLinks = (check: CheckResult, data: Record<string, unknown> | undefined): Visualization => {
  const total = readNumber(data, "total");
  if (total == null) return PRESENCE;

  const follow = readNumber(data, "follow") ?? 0;

  return {
    type: "proportion",
    segment: {
      countLabel: `${follow} / ${total}`,
      filledPct: total ? (follow / total) * 100 : 0,
      filledStatus: check.status === "good" ? "good" : "warn",
      legend: [
        { tone: "good", label: `${follow} dofollow` },
        { tone: "muted", label: `${total - follow} nofollow` },
      ],
    },
  };
};
