import type { ReleaseStatus } from "../../types";
import { isValidTransition } from "../../validation/statusTransitions";

const STATUS_DISABLED_REASON: Partial<Record<ReleaseStatus, string>> = {
  publishing: "Release is currently being published",
  published: "This release has already been published",
  reverting: "Release is currently being reverted",
  reverted: "Release has been reverted",
  failed: "Release failed to publish — reset it to draft to retry",
};

export function getPublishButtonProps(status?: ReleaseStatus): {
  disabled: boolean;
  tooltip?: string;
} {
  if (!status) return { disabled: false };
  if (isValidTransition(status, "publishing")) return { disabled: false };
  return {
    disabled: true,
    tooltip:
      STATUS_DISABLED_REASON[status] ?? `Cannot publish from "${status}"`,
  };
}
