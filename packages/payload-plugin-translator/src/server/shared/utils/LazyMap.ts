/**
 * Options for LazyMap configuration.
 */
export type LazyMapOptions<V> = {
  /**
   * Maximum number of entries to keep in the map.
   * When exceeded, oldest removable entries are deleted.
   * @default Infinity
   */
  maxSize?: number
  /**
   * Time-to-live for removable entries in milliseconds.
   * Expired entries are removed lazily during set operations.
   * @default Infinity
   */
  ttlMs?: number
  /**
   * Predicate to determine which entries can be removed during cleanup.
   * Returns true if the entry is eligible for removal.
   */
  isRemovable: (value: V) => boolean
  /**
   * Function to extract timestamp from a value for age calculation.
   * Used for TTL expiration and oldest-first removal.
   */
  getTimestamp: (value: V) => number
}

/**
 * A Map wrapper with lazy cleanup capabilities.
 *
 * Automatically removes expired and excess entries during set operations.
 * Uses lazy cleanup pattern (no timers) - cleanup runs only when needed.
 *
 * @example
 * ```typescript
 * const tasks = new LazyMap<string, Task>({
 *   maxSize: 100,
 *   ttlMs: 60 * 60 * 1000, // 1 hour
 *   isRemovable: (task) => task.status === 'completed' || task.status === 'failed',
 *   getTimestamp: (task) => new Date(task.updatedAt).getTime(),
 * })
 *
 * tasks.set('task-1', task) // Cleanup runs automatically
 * ```
 */
export class LazyMap<K, V> {
  private readonly map = new Map<K, V>()
  private readonly maxSize: number
  private readonly ttlMs: number
  private readonly isRemovable: (value: V) => boolean
  private readonly getTimestamp: (value: V) => number

  constructor(options: LazyMapOptions<V>) {
    this.maxSize = options.maxSize ?? Infinity
    this.ttlMs = options.ttlMs ?? Infinity
    this.isRemovable = options.isRemovable
    this.getTimestamp = options.getTimestamp
  }

  /**
   * Sets a key-value pair, triggering cleanup after.
   */
  set(key: K, value: V): void {
    this.map.set(key, value)
    this.cleanup()
  }

  get(key: K): V | undefined {
    return this.map.get(key)
  }

  delete(key: K): boolean {
    return this.map.delete(key)
  }

  has(key: K): boolean {
    return this.map.has(key)
  }

  values(): IterableIterator<V> {
    return this.map.values()
  }

  entries(): IterableIterator<[K, V]> {
    return this.map.entries()
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.map[Symbol.iterator]()
  }

  get size(): number {
    return this.map.size
  }

  /**
   * Remove expired entries and enforce maxSize limit.
   * Called automatically during set() operations.
   */
  private cleanup(): void {
    const now = Date.now()

    // 1. Remove expired entries
    if (this.ttlMs !== Infinity) {
      for (const [key, value] of this.map) {
        if (!this.isRemovable(value)) continue
        if (now - this.getTimestamp(value) > this.ttlMs) {
          this.map.delete(key)
        }
      }
    }

    // 2. Enforce maxSize by removing oldest removable entries
    while (this.map.size > this.maxSize) {
      const oldestKey = this.findOldestRemovableKey()
      if (!oldestKey) break // Only non-removable entries left
      this.map.delete(oldestKey)
    }
  }

  private findOldestRemovableKey(): K | undefined {
    let oldestKey: K | undefined
    let oldestTime = Infinity

    for (const [key, value] of this.map) {
      if (!this.isRemovable(value)) continue
      const timestamp = this.getTimestamp(value)
      if (timestamp < oldestTime) {
        oldestTime = timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }
}
