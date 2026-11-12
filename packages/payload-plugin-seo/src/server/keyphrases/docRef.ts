import type { DocTarget } from "../../keyphrases/docTarget";
import { readDocId } from "../../keyphrases/docTarget";

export function readDocTarget(source: unknown, allowedCollections: string[]): DocTarget | null {
  if (typeof source !== "object" || source === null) return null;

  const { collection, docId } = source as Record<string, unknown>;
  const id = readDocId(docId);

  if (typeof collection !== "string" || !allowedCollections.includes(collection)) return null;
  if (!id) return null;

  return { collection, docId: id };
}
