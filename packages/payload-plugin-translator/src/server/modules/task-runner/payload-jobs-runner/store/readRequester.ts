import type { StoredInput } from "./types.js";

/** The requester a stored job recorded, or `null` when it recorded none. */
export function readRequester(
  input: StoredInput | undefined
): { id: string; collection: string } | null {
  const id = input?.requester_id;
  const collection = input?.requester_collection;
  if (id === null || id === undefined || !collection) return null;
  return { id: String(id), collection };
}
