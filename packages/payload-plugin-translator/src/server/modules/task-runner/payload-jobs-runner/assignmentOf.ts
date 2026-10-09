import type { CollectionSlug } from "payload";

import type { EnqueueAssignment } from "../types.js";
import { handleOf } from "./handleOf.js";
import { readCollectionRef } from "./readCollectionRef.js";
import type { PayloadJob } from "./types.js";

/**
 * One locale of a stored run — or nothing, when the row cannot describe itself.
 *
 * A row this plugin queued always carries all of it, but `PayloadJob` also models rows from before
 * the id-agnostic migration. Rather than substitute a default, an undescribable row yields nothing
 * and its caller sends no event: a guessed `strategy` would reach the host as fact, and an empty
 * handle would be an assignment the contract says cannot exist.
 */
export const assignmentOf = (job: PayloadJob, targetLng: string): EnqueueAssignment | undefined => {
  const { collectionSlug, collectionId } = readCollectionRef(job.input);
  const sourceLng = job.input?.source_lng;
  const strategy = job.input?.strategy;
  const handle = handleOf(job);
  if (!(sourceLng && strategy && handle)) return undefined;

  return {
    collectionSlug: collectionSlug as CollectionSlug,
    collectionId,
    sourceLng,
    targetLng,
    strategy,
    handle,
  };
};
