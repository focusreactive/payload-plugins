import type { VeDocument } from "./protocol.js";
import type { PlainObject } from "./plainObject.js";

export const documentAddressOf = ({ kind, collectionSlug, docId }: VeDocument): string =>
  JSON.stringify([kind, collectionSlug, docId ?? null]);

export const fieldAddressOf = (document: VeDocument, key: string): string =>
  JSON.stringify([documentAddressOf(document), key]);

export const keyedFieldAddressOf = (field: VeDocument & { key: string }): string =>
  fieldAddressOf(field, field.key);

export const isVeDocument = (value: PlainObject): value is PlainObject & VeDocument =>
  typeof value.collectionSlug === "string" &&
  (value.kind === "collection" || value.kind === "global") &&
  (value.docId === undefined || typeof value.docId === "string");

export const veDocumentOf = <Document extends VeDocument>({
  collectionSlug,
  kind,
  docId,
}: Document) => ({
  collectionSlug,
  kind,
  ...(docId !== undefined && { docId }),
});

export const idOf = (value: unknown): string | number | null =>
  typeof value === "string" || typeof value === "number" ? value : null;

export const collectionDocumentOf = (collectionSlug: string, id: unknown): VeDocument => {
  const docId = idOf(id);
  return {
    collectionSlug,
    kind: "collection",
    ...(docId !== null && { docId: String(docId) }),
  };
};
