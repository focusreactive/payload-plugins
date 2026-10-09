/**
 * What a host's config may hold where a plugin wants to add to a list: nothing yet, the list
 * itself, or a function that produces it. Payload declares `jobs.autoRun` exactly this way.
 */
export type Contributable<T, A extends unknown[]> =
  | T[]
  | ((...args: A) => T[] | Promise<T[]>)
  | undefined;

const appended = <T>(into: T[], entries: T[], identity: (entry: T) => string): T[] => {
  const present = new Set(into.map(identity));
  const result = [...into];
  for (const entry of entries) {
    const key = identity(entry);
    if (present.has(key)) continue;
    present.add(key);
    result.push(entry);
  }
  return result;
};

/**
 * Add this plugin's entries to a list on the host's config, keeping whatever the host already put
 * there and skipping an entry whose key is already present.
 *
 * Three things a signature cannot say:
 *
 * - **Order.** The entries land after what the host had.
 * - **Identity.** The first entry with a given key wins; a later duplicate is dropped and never
 *   replaces it.
 * - **When the duplicate check happens.** On a list, now. On a function, only when that function
 *   is called — what it will return cannot be known at config time, so the check travels with it.
 */
export function contribute<T>(
  current: T[] | undefined,
  entries: T[],
  identity: (entry: T) => string
): T[];
export function contribute<T, A extends unknown[]>(
  current: Contributable<T, A>,
  entries: T[],
  identity: (entry: T) => string
): Contributable<T, A>;
export function contribute<T, A extends unknown[]>(
  current: Contributable<T, A>,
  entries: T[],
  identity: (entry: T) => string
): Contributable<T, A> {
  if (typeof current === "function") {
    return async (...args: A) => appended(await current(...args), entries, identity);
  }
  return appended(current ?? [], entries, identity);
}

/**
 * Run this plugin's handler after whatever the host already registered, awaiting theirs first so
 * an asynchronous one finishes before ours starts.
 */
export function chain<A extends unknown[]>(
  existing: ((...args: A) => void | Promise<void>) | undefined,
  mine: (...args: A) => void | Promise<void>
): (...args: A) => Promise<void> {
  return async (...args: A) => {
    if (existing) await existing(...args);
    await mine(...args);
  };
}
