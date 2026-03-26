import type { ReleaseStatus } from "../types";

export const VALID_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  draft: ["scheduled", "publishing", "cancelled"],
  scheduled: ["draft", "publishing"],
  publishing: ["published", "failed"],
  published: [],
  failed: ["draft"],
  cancelled: [],
};

export function isValidTransition(from: ReleaseStatus, to: ReleaseStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
