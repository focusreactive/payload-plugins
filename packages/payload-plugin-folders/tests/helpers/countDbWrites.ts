import type { Payload } from "payload";

export type DbWrite = { collection: string; id?: number | string; method: string };

const writeMethods = [
  "create",
  "createVersion",
  "deleteMany",
  "deleteOne",
  "deleteVersions",
  "updateMany",
  "updateOne",
  "updateVersion",
  "upsert",
] as const;

type WritableAdapter = Record<
  string,
  (args: { collection?: string; id?: number | string }) => Promise<unknown>
>;

/**
 * Runs `work` with the database adapter's write methods wrapped, and returns every write it made.
 * The wrappers are removed before it returns, also when `work` throws.
 */
export const countDbWrites = async <TResult>(
  payload: Payload,
  work: () => Promise<TResult>
): Promise<{ result: TResult; writes: DbWrite[] }> => {
  const adapter = payload.db as unknown as WritableAdapter;
  const writes: DbWrite[] = [];
  const originals = new Map<string, WritableAdapter[string]>();

  for (const method of writeMethods) {
    const original = adapter[method];
    if (typeof original !== "function") {
      continue;
    }
    originals.set(method, original);
    adapter[method] = function countedWrite(this: unknown, args) {
      writes.push({ collection: String(args.collection), id: args.id, method });

      return original.call(this, args);
    };
  }

  try {
    const result = await work();

    return { result, writes };
  } finally {
    for (const [method, original] of originals) {
      adapter[method] = original;
    }
  }
};
