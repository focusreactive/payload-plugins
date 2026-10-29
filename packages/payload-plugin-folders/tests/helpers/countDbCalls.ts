import type { Payload } from "payload";

export type DbCall = { collection: string; method: string };

const countedMethods = [
  "count",
  "find",
  "findDistinct",
  "findOne",
  "findVersions",
  "queryDrafts",
] as const;

type CountableAdapter = Record<string, (args: { collection?: string }) => Promise<unknown>>;

/**
 * Runs `work` with the database adapter's read methods wrapped, and returns every read it made.
 * Tests use it to prove a list read costs a bounded number of queries; the wrappers are removed
 * before it returns, also when `work` throws.
 */
export const countDbCalls = async <TResult>(
  payload: Payload,
  work: () => Promise<TResult>
): Promise<{ calls: DbCall[]; result: TResult }> => {
  const adapter = payload.db as unknown as CountableAdapter;
  const calls: DbCall[] = [];
  const originals = new Map<string, CountableAdapter[string]>();

  for (const method of countedMethods) {
    const original = adapter[method];
    if (typeof original !== "function") {
      continue;
    }
    originals.set(method, original);
    adapter[method] = function countedCall(this: unknown, args) {
      calls.push({ collection: String(args.collection), method });

      return original.call(this, args);
    };
  }

  try {
    const result = await work();

    return { calls, result };
  } finally {
    for (const [method, original] of originals) {
      adapter[method] = original;
    }
  }
};

export const countCallsOn = (calls: DbCall[], collection: string): number =>
  calls.filter((call) => call.collection === collection).length;
