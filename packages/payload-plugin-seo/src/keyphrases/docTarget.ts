export interface DocTarget {
  collection: string;
  docId: string;
}

export function docTargetKey(collection: string, id: string): string {
  return `${collection}:${id}`;
}

export function readDocId(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();

  return null;
}
