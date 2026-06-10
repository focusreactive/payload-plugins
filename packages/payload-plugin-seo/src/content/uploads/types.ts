export interface UploadRef {
  collection: string;
  id: string | number;
}

export type ResolvedUploadDoc = Record<string, unknown>;

export type UploadTransform = (ref: UploadRef) => unknown;

export function uploadKey(ref: UploadRef): string {
  return `${ref.collection}:${ref.id}`;
}
