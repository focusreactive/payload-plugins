import type { DocKind } from "./protocol.js";

import { FIELD_PATH_SEPARATOR, isRowIndex, pathOf } from "./fieldKey.js";
import { isPlainObject } from "./plainObject.js";
import { isVeDocument, veDocumentOf } from "./veDocument.js";

export const META_KEY = "_meta";

export type VeIdentity = {
  path: string;
  collectionSlug: string;
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

const DOC_KINDS: readonly DocKind[] = ["collection", "global"];

const ABSENT = 0;

type Absent = typeof ABSENT;

export type StegaPayload = [
  kind: number,
  collectionSlug: string,
  docId: string | Absent,
  path: string,
  rowIdsOrKey?: readonly string[] | string | Absent,
  locale?: string,
];

const segmentsOf = (path: string): string[] => path.split(FIELD_PATH_SEPARATOR);

const keyOfRowIds = (path: string, rowIds: readonly string[]): string => {
  const unplaced = [...rowIds];
  return pathOf(
    segmentsOf(path).map((segment) =>
      isRowIndex(segment) ? (unplaced.shift() ?? segment) : segment
    )
  );
};

const rowIdsOf = (path: string, key: string): string[] | null => {
  const pathSegments = segmentsOf(path);
  const keySegments = segmentsOf(key);
  if (keySegments.length !== pathSegments.length) return null;
  const rowIds = keySegments.filter((_segment, index) => isRowIndex(pathSegments[index] ?? ""));
  return keyOfRowIds(path, rowIds) === key ? rowIds : null;
};

const withoutAbsentTail = (payload: StegaPayload): StegaPayload => {
  const last = payload.at(-1);
  return last === ABSENT || last === undefined
    ? withoutAbsentTail(payload.slice(0, -1) as StegaPayload)
    : payload;
};

export const toStegaPayload = ({
  collectionSlug,
  docId,
  key,
  kind,
  locale,
  path,
}: VeIdentity): StegaPayload =>
  withoutAbsentTail([
    DOC_KINDS.indexOf(kind),
    collectionSlug,
    docId ?? ABSENT,
    path,
    key === undefined ? ABSENT : (rowIdsOf(path, key) ?? key),
    locale,
  ]);

const keyOfPayload = (path: string, rowIdsOrKey: unknown): string | undefined => {
  if (!Array.isArray(rowIdsOrKey)) return optionalString(rowIdsOrKey);
  return rowIdsOrKey.every((rowId) => typeof rowId === "string")
    ? keyOfRowIds(path, rowIdsOrKey)
    : undefined;
};

const identityOfPayload = ([
  kindCode,
  collectionSlug,
  docId,
  path,
  rowIdsOrKey,
  locale,
]: readonly unknown[]): unknown => ({
  collectionSlug,
  docId: optionalString(docId),
  key: typeof path === "string" ? keyOfPayload(path, rowIdsOrKey) : undefined,
  kind: typeof kindCode === "number" ? DOC_KINDS[kindCode] : undefined,
  locale,
  path,
});

export const fromStegaPayload = (payload: unknown): VeIdentity | null => {
  const decoded = Array.isArray(payload) ? identityOfPayload(payload) : payload;
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
