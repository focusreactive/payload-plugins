import type { EnqueueAssignment } from "../task-runner/types.js";
import type { TranslationTask } from "./types.js";

export const taskFromAssignment = (assignment: EnqueueAssignment): TranslationTask => ({
  collection: assignment.collectionSlug,
  id: assignment.collectionId,
  sourceLng: assignment.sourceLng,
  targetLng: assignment.targetLng,
  handle: assignment.handle,
});
