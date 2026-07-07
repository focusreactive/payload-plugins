import type { TaskInput } from "../task-runner/types";
import type { TaskHandlerInput } from "../task-runner/TaskRunnerProvider.interface";
import type { TranslationTask } from "./types";

/** Map an enqueue-side {@link TaskInput} to the public {@link TranslationTask}. */
export const taskFromInput = (task: TaskInput): TranslationTask => ({
  collection: task.collectionSlug,
  id: task.collectionId,
  sourceLng: task.sourceLng,
  targetLng: task.targetLng,
  strategy: task.strategy,
});

/** Map an execution-side {@link TaskHandlerInput} to the public {@link TranslationTask}. */
export const taskFromHandlerInput = (input: TaskHandlerInput): TranslationTask => ({
  collection: input.collection,
  id: input.collectionId,
  sourceLng: input.sourceLng,
  targetLng: input.targetLng,
  strategy: input.strategy,
});
