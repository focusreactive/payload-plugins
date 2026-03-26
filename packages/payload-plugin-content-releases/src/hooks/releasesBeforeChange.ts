import type { CollectionBeforeChangeHook } from "payload";
import type { ReleaseStatus } from "../types";
import { isValidTransition, VALID_TRANSITIONS } from "../validation/statusTransitions";

export const releasesBeforeChange: CollectionBeforeChangeHook = ({
  data,
  originalDoc,
  operation,
}) => {
  if (operation === "create") {
    return { ...data, status: "draft" };
  }

  const currentStatus = (originalDoc as any)?.status as ReleaseStatus | undefined;
  const newStatus = data.status as ReleaseStatus | undefined;

  if (!newStatus || !currentStatus || newStatus === currentStatus) {
    return data;
  }

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Invalid status transition: "${currentStatus}" → "${newStatus}". Allowed from "${currentStatus}": [${VALID_TRANSITIONS[currentStatus].join(", ")}]`,
    );
  }

  return data;
};
