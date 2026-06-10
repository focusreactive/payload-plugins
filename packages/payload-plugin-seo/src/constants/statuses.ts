import type { Status } from "../engine/types/analysis";

export const STATUS_PILL_LABEL: Record<Status, string> = {
  good: "Good",
  warn: "Needs work",
  bad: "Problem",
};
