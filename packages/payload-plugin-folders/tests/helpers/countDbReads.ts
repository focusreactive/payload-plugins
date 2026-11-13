import type { Payload } from "payload";

const readMethods = [
  "count",
  "countVersions",
  "find",
  "findDistinct",
  "findGlobal",
  "findGlobalVersions",
  "findOne",
  "findVersions",
  "queryDrafts",
] as const;

type ReadableAdapter = Record<string, (args: unknown) => Promise<unknown>>;

/**
 * Runs `work` with the database adapter's read methods wrapped and returns how many reads it made.
 * The wrappers are removed before it returns, also when `work` throws.
 */
export const countDbReads = async <TResult>(
  payload: Payload,
  work: () => Promise<TResult>
): Promise<{ reads: number; result: TResult }> => {
  const adapter = payload.db as unknown as ReadableAdapter;
  const originals = new Map<string, ReadableAdapter[string]>();
  let reads = 0;

  for (const method of readMethods) {
    const original = adapter[method];
    if (typeof original !== "function") {
      continue;
    }
    originals.set(method, original);
    adapter[method] = function countedRead(this: unknown, args) {
      reads += 1;

      return original.call(this, args);
    };
  }

  try {
    const result = await work();

    return { reads, result };
  } finally {
    for (const [method, original] of originals) {
      adapter[method] = original;
    }
  }
};
