export type RefKind = "upload" | "relationship";

export interface DocRef {
  collection: string;
  id: string | number;
  kind: RefKind;
}

export type ResolvedDoc = Record<string, unknown>;

export function refKey(ref: { collection: string; id: string | number }): string {
  return `${ref.collection}:${ref.id}`;
}
