import type { CollectionSlug } from "payload";

export type PlainObject = Record<string, unknown>;

export const META_KEY = "_meta";

// Sentinel inserted into path segments when the enriched document root is an
// array, so `enrichWithPathMeta` and `encodeStega` agree on the shape.
export const ROOT_ARRAY_TOKEN = "<array>";

export type DocKind = "collection" | "global";

// Minimal tuple that identifies an editable field anywhere in the pipeline.
// Every transport bag (MetaInfo, stega payload, data-ve-* attrs, postMessage)
// projects from this shape — `spreadVeIdentity` centralises the `docId` omission.
export type VeIdentity = {
  path: string;
  collectionSlug: CollectionSlug;
  kind: DocKind;
  docId?: string;
};

// Per-holder provenance. `docId` is absent for globals (their slug is the key).
// `terminal` marks holders whose path already resolved to a leaf renderer (e.g.
// rich text) — the encoder writes the path to `_meta` instead of re-encoding.
export type MetaInfo = VeIdentity & { terminal?: true };

export const isPlainObject = (value: unknown): value is PlainObject =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const isMetaInfo = (value: unknown): value is MetaInfo => {
  if (!isPlainObject(value)) return false;
  return typeof value.path === "string" && typeof value.collectionSlug === "string";
};

// Omit `docId` when absent; globals never have one, and a literal `undefined`
// is not valid in stega payloads or DOM data attributes.
export const spreadVeIdentity = (id: VeIdentity) => ({
  path: id.path,
  collectionSlug: id.collectionSlug,
  kind: id.kind,
  ...(id.docId !== undefined && { docId: id.docId }),
});

export const toMetaInfo = (id: VeIdentity, options?: { terminal?: true }): MetaInfo => {
  const meta: MetaInfo = {
    path: id.path,
    collectionSlug: id.collectionSlug,
    kind: id.kind,
  };
  if (id.docId !== undefined) {
    meta.docId = id.docId;
  }
  if (options?.terminal) {
    meta.terminal = true;
  }
  return meta;
};

export const toStegaPayload = (id: VeIdentity) => spreadVeIdentity(id);

export const fromStegaPayload = (decoded: unknown) => {
  if (!isPlainObject(decoded)) return null;

  const { path, collectionSlug, kind, docId } = decoded;

  if (typeof path !== "string" || typeof collectionSlug !== "string") {
    return null;
  }
  if (kind !== "collection" && kind !== "global") {
    return null;
  }

  const id: VeIdentity = { path, collectionSlug: collectionSlug as CollectionSlug, kind };
  if (typeof docId === "string") {
    id.docId = docId;
  }
  return id;
};
