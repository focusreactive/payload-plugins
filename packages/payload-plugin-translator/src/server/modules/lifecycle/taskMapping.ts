import type { EnqueueAssignment } from "../task-runner/types.js";
import type { TranslationTask } from "./types.js";

/**
 * `publishOnTranslation` is deliberately not carried: it is a write concern of the translation,
 * not a fact about the task.
 */
export const taskFromAssignment = (assignment: EnqueueAssignment): TranslationTask => ({
  collection: assignment.collectionSlug,
  id: assignment.collectionId,
  sourceLng: assignment.sourceLng,
  targetLng: assignment.targetLng,
  strategy: assignment.strategy,
  handle: assignment.handle,
});
