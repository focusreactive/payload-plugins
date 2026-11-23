import type {
  CollectionAfterOperationHook,
  GlobalAfterReadHook,
  GlobalBeforeOperationHook,
  PayloadRequest,
} from "payload";

import type { ValueExcludePredicate } from "../../excludeValues.js";
import type { PlainObject } from "../../shared/plainObject.js";
import type { VeDocument } from "../../shared/protocol.js";
import type { MarkedReadsOptions } from "../markedReads.js";
import type { ReadOfDocument } from "../markRead.js";
import type { SchemaCache } from "../schemaCache.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { collectionDocumentOf, idOf } from "../../shared/veDocument.js";
import { localeCodesKeyingValues } from "../localeCodesKeyingValues.js";
import { createMarkedReads, isCollectionVersionRead } from "../markedReads.js";
import { markRead } from "../markRead.js";

export type ReadHooksOptions = MarkedReadsOptions & {
  schemaCache: SchemaCache;
  excludeValues: readonly ValueExcludePredicate[];
  instantPreview: boolean;
};

const parentIdOf = (parent: unknown, version: PlainObject): unknown =>
  idOf(isPlainObject(parent) ? parent.id : parent) ?? version.id;

export const createReadHooks = (options: ReadHooksOptions) => {
  const markedReads = createMarkedReads(options);

  const readOf = (req: PayloadRequest, identity: VeDocument): ReadOfDocument => ({
    excludeValues: options.excludeValues,
    identity,
    instantPreview: options.instantPreview,
    localeCodesKeyingValues: localeCodesKeyingValues(req),
    schema: options.schemaCache.get(identity.collectionSlug, req.payload),
  });

  const collectionAfterOperation: CollectionAfterOperationHook = ({
    args,
    collection,
    operation,
    req,
    result,
  }) => {
    if (!markedReads.isCollectionReadMarked({ args, operation, req })) return result;

    const isVersionRead = isCollectionVersionRead(operation);
    const markDocument = <Value>(doc: Value): Value => {
      if (!isPlainObject(doc)) return doc;
      if (!isVersionRead) {
        return markRead(doc, readOf(req, collectionDocumentOf(collection.slug, doc.id))) as Value;
      }
      const { version } = doc;
      if (!isPlainObject(version)) return doc;
      const read = readOf(
        req,
        collectionDocumentOf(collection.slug, parentIdOf(doc.parent, version))
      );
      return { ...doc, version: markRead(version, read) };
    };

    if (operation !== "find" && operation !== "findVersions") return markDocument(result);
    if (Array.isArray(result.docs)) result.docs = result.docs.map((doc) => markDocument(doc));
    return result;
  };

  const globalBeforeOperation: GlobalBeforeOperationHook = ({ args, global, operation, req }) => {
    markedReads.openGlobalRead({ args, operation, req, slug: global.slug });
  };

  const globalAfterRead: GlobalAfterReadHook = (read) => {
    const { doc, global, req } = read;
    if (!markedReads.closeGlobalRead({ ...read, slug: global.slug })) return doc;
    if (!isPlainObject(doc)) return doc;
    return markRead(doc, readOf(req, { collectionSlug: global.slug, kind: "global" }));
  };

  return { collectionAfterOperation, globalAfterRead, globalBeforeOperation };
};
