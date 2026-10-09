import type { Task } from "../types.js";

/**
 * Which of a run's locales it has not delivered; a locale it never reached is owed too.
 *
 * The caller passes one run's tasks, one per target locale.
 */
export type StillOwed = (tasks: Task[]) => Task[];

export const stillOwed: StillOwed = (tasks) => tasks.filter((task) => task.status !== "completed");
