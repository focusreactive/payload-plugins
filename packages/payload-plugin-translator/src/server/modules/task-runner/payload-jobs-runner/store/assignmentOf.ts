import type { EnqueueAssignment } from "../../types.js";
import { handleOf } from "./handleOf.js";
import { readCollectionRef } from "./readCollectionRef.js";
import type { PayloadJob } from "./types.js";

/**
 * One locale of a stored run — or nothing, when the row cannot describe itself.
 *
 * Rather than substitute a default: a guessed collection or source language would reach the host as
 * fact, and an empty handle would be an assignment the contract says cannot exist.
 */
export const assignmentOf = (job: PayloadJob, targetLng: string): EnqueueAssignment | undefined => {
  const { collectionSlug, collectionId } = readCollectionRef(job.input);
  const sourceLng = job.input?.source_lng;
  const handle = handleOf(job);
  if (!(collectionSlug && sourceLng && handle)) return undefined;

  return {
    collectionSlug: collectionSlug,
    collectionId,
    sourceLng,
    targetLng,
    handle,
  };
};
