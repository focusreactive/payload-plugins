import type { TaskFilter } from "./TaskRunner.interface";

/**
 * Normalize the two accepted shapes of {@link TaskRunner.findByCollection}'s second argument.
 *
 * Every implementation of {@link TaskRunner} owes this, so it ships alongside the contract rather
 * than being re-derived: the array form is deprecated and will be removed, and a hand-written
 * `Array.isArray` branch in someone else's runner would outlive it.
 *
 * @since 0.11.2
 */
export function toTaskFilter(filter?: Array<string | number> | TaskFilter): TaskFilter {
  return Array.isArray(filter) ? { documentIds: filter } : (filter ?? {});
}
