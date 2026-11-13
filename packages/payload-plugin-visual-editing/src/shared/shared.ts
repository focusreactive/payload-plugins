import type { CollectionSlug } from "payload";

import type { DocKind } from "./protocol.js";

import { isPlainObject } from "./plainObject.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

export const META_KEY = "_meta";

export type VeIdentity = {
  path: string;
  collectionSlug: CollectionSlug;
  kind: DocKind;
  docId?: string;
  key?: string;
  locale?: string;
};

export type MetaInfo = VeIdentity & { terminal?: true };

export const isMetaInfo = (value: unknown): value is MetaInfo => {
  if (!isPlainObject(value)) return false;
  return typeof value.path === "string" && typeof value.collectionSlug === "string";
};

export const spreadVeIdentity = (id: VeIdentity) => ({
  path: id.path,
  ...veDocumentOf(id),
});

export const veIdentityOf = (id: VeIdentity): VeIdentity => ({
  ...spreadVeIdentity(id),
  ...(id.key !== undefined && { key: id.key }),
  ...(id.locale !== undefined && { locale: id.locale }),
});

export const fieldReferenceOf = (id: VeIdentity): MetaInfo => ({
  ...veIdentityOf(id),
  terminal: true,
});

const optionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const fromStegaPayload = (decoded: unknown): VeIdentity | null => {
  if (!isPlainObject(decoded) || typeof decoded.path !== "string" || !isVeDocument(decoded)) {
    return null;
  }
  return veIdentityOf({
    ...veDocumentOf(decoded),
    key: optionalString(decoded.key),
    locale: optionalString(decoded.locale),
    path: decoded.path,
  });
};
