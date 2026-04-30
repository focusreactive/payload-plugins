import type { CollectionBeforeChangeHook } from "payload";
import type { ReleaseStatus } from "../types";
import { isValidTransition, VALID_TRANSITIONS } from "../validation/statusTransitions";

export const releasesBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation === "create") {
    const initialStatus: ReleaseStatus = data.scheduledAt ? "scheduled" : "draft";
    return { ...data, status: initialStatus };
  }

  const currentStatus = (originalDoc as any)?.status as ReleaseStatus | undefined;
  const newStatus = data.status as ReleaseStatus | undefined;

  if (!newStatus || newStatus === currentStatus) {
    if (currentStatus === "draft" || currentStatus === "scheduled") {
      const willHaveScheduledAt =
        "scheduledAt" in data
          ? data.scheduledAt
          : (originalDoc as any)?.scheduledAt;
      const desiredStatus: ReleaseStatus = willHaveScheduledAt ? "scheduled" : "draft";
      if (currentStatus !== desiredStatus) {
        return { ...data, status: desiredStatus };
      }
    }
    return data;
  }

  if (!currentStatus) {
    return data;
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: "${currentStatus}" → "${newStatus}". Allowed from "${currentStatus}": [${VALID_TRANSITIONS[currentStatus].join(", ")}]`,
    );
  }

  return data;
};
