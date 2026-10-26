import type { Task } from "../../types.js";

/** A run's undelivered locales. Takes one run's tasks, one per target locale. */
export type StillOwed = (tasks: Task[]) => Task[];

export const stillOwed: StillOwed = (tasks) => tasks.filter((task) => task.status !== "completed");
