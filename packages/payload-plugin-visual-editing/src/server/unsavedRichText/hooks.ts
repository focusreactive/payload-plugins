import type { CollectionBeforeReadHook, GlobalBeforeReadHook, PayloadRequest } from "payload";

import type { LiveRichTextField, VeDocument } from "../../shared/protocol.js";
import type { SchemaCache } from "../schemaCache.js";

import { localeOf } from "../localeCodesKeyingValues.js";
import { collectionDocumentOf, documentAddressOf } from "../../shared/veDocument.js";
import { placeUnsavedState } from "./placeUnsavedState.js";
import { savedReferencesOnlyOf, unsavedRichTextOf } from "./readContext.js";
import { isPrivateCollectionOf, withOnlyReferencesOf } from "./savedReferences.js";
import { richTextValueAt } from "../../shared/editableSchema/editableSchema.js";

type DocumentRead = {
  document: VeDocument;
  overrideAccess: boolean | undefined;
  req: PayloadRequest;
  stored: unknown;
};

const isReadOf = (
  { document, overrideAccess }: DocumentRead,
  field: LiveRichTextField | undefined
): field is LiveRichTextField =>
  field !== undefined &&
  overrideAccess === false &&
  documentAddressOf(field) === documentAddressOf(document);

const placeIntoReadDocument = (read: DocumentRead, schemaCache: SchemaCache): void => {
  const { document, req, stored } = read;
  const unsaved = unsavedRichTextOf(req.context);
  const restricted = savedReferencesOnlyOf(req.context);
  const placed = unsaved && !unsaved.isPlaced && isReadOf(read, unsaved.field) ? unsaved : null;
  const held =
    restricted && !restricted.isApplied && isReadOf(read, restricted.field) ? restricted : null;
  if (!placed && !held) return;

  const schema = schemaCache.get(document.collectionSlug, req.payload);
  if (!schema) return;
  const locale = localeOf(req);
  const savedField = held && richTextValueAt(schema, stored, held.field.key, locale);
  const saved = savedField?.holder[savedField.property];

  if (placed) {
    placed.isPlaced = placeUnsavedState(stored, schema, {
      fieldKey: placed.field.key,
      locale,
      state: placed.state,
    });
  }
  if (held && savedField) {
    savedField.holder[savedField.property] = withOnlyReferencesOf(
      savedField.holder[savedField.property],
      saved,
      isPrivateCollectionOf(req.payload)
    );
    held.isApplied = true;
  }
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
