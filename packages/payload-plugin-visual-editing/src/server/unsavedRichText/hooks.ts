import type { CollectionBeforeReadHook, GlobalBeforeReadHook, PayloadRequest } from "payload";

import type { VeDocument } from "../../shared/protocol.js";
import type { SchemaCache } from "../schemaCache.js";

import { localeOf } from "../localeCodesKeyingValues.js";
import { collectionDocumentOf, documentAddressOf } from "../../shared/veDocument.js";
import { placeUnsavedState } from "./placeUnsavedState.js";
import { unsavedRichTextOf } from "./readContext.js";

type DocumentRead = {
  document: VeDocument;
  overrideAccess: boolean | undefined;
  req: PayloadRequest;
  stored: unknown;
};

const placeIntoReadDocument = (
  { document, overrideAccess, req, stored }: DocumentRead,
  schemaCache: SchemaCache
): void => {
  const unsaved = unsavedRichTextOf(req.context);
  if (!unsaved || unsaved.isPlaced || overrideAccess !== false) return;
  if (documentAddressOf(unsaved.field) !== documentAddressOf(document)) return;

  const schema = schemaCache.get(document.collectionSlug, req.payload);
  if (!schema) return;
  unsaved.isPlaced = placeUnsavedState(stored, schema, {
    fieldKey: unsaved.field.key,
    locale: localeOf(req),
    state: unsaved.state,
  });
};

export const createUnsavedRichTextHook =
  (schemaCache: SchemaCache): CollectionBeforeReadHook =>
  ({ collection, doc, overrideAccess, req }) => {
    if (collection.auth) return doc;
    const document = collectionDocumentOf(collection.slug, doc?.id);
    placeIntoReadDocument({ document, overrideAccess, req, stored: doc }, schemaCache);
    return doc;
  };

export const createGlobalUnsavedRichTextHook =
  (schemaCache: SchemaCache): GlobalBeforeReadHook =>
  ({ doc, global, overrideAccess, req }) => {
    const document: VeDocument = { collectionSlug: global.slug, kind: "global" };
    placeIntoReadDocument({ document, overrideAccess, req, stored: doc }, schemaCache);
    return doc;
  };
