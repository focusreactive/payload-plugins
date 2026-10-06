import type { Task, TaskInput } from "../task-runner/types.js";
import type { TaskHandlerInput } from "../task-runner/TaskRunnerProvider.interface.js";
import type { TranslationTask } from "./types.js";

/** Map an enqueue-side {@link TaskInput} to the public {@link TranslationTask}. */
export const taskFromInput = (task: TaskInput): TranslationTask => ({
  collection: task.collectionSlug,
  id: task.collectionId,
  sourceLng: task.sourceLng,
  targetLng: task.targetLng,
  strategy: task.strategy,
});

export const taskFromStored = (task: Task): TranslationTask => ({
  collection: task.input.collectionSlug,
  id: task.input.collectionId,
  sourceLng: task.input.sourceLng,
  targetLng: task.input.targetLng,
  strategy: task.input.strategy,
  jobId: task.id,
});

/** Map an execution-side {@link TaskHandlerInput} to the public {@link TranslationTask}. */
export const taskFromHandlerInput = (input: TaskHandlerInput): TranslationTask => ({
  collection: input.collection,
  id: input.collectionId,
  sourceLng: input.sourceLng,
  targetLng: input.targetLng,
  strategy: input.strategy,
  ...(input.jobId === undefined ? {} : { jobId: input.jobId }),
  ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
});
