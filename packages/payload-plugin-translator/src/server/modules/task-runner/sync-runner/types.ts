/**
 * Options for SyncRunnerProvider
 */
export type SyncRunnerOptions = {
  /**
   * Maximum number of task results to keep in memory.
   * When exceeded, oldest completed entries are removed.
   * @default 100
   */
  maxSize?: number
  /**
   * Time-to-live for completed task results in milliseconds.
   * Expired entries are removed lazily during enqueue operations.
   * @default 3600000 (1 hour)
   */
  ttlMs?: number
}
