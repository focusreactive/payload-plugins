import type { Payload } from "payload";

import { TranslatorConfigError } from "../../../core/errors/index.js";
import type { FieldLike } from "../../../core/kernel/field-traversal/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { RunTarget } from "../../modules/translation-run/index.js";
import type { TranslateDocumentInput } from "./translateDocument.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { openTargetDocument } from "./targetDocument.js";
import type { TargetDocument } from "./targetDocument.js";
import { resolveTargetLayer } from "./targetLayer.js";
import type { TargetLayer } from "./targetLayer.js";

export type Run = {
  readonly payload: Payload;
  readonly target: RunTarget;
  readonly scope: RequestScope;
  readonly schema: FieldLike[];
  readonly layer: TargetLayer;
  readonly doc: TargetDocument;
};

export async function openRun(args: {
  payload: Payload;
  taskInput: Pick<
    TranslateDocumentInput,
    "collection" | "collectionId" | "sourceLng" | "targetLng"
  >;
  scope: RequestScope;
  schemaMap: CollectionSchemaMap;
}): Promise<Run> {
  const { payload, taskInput, scope, schemaMap } = args;

  const schema = schemaMap.get(taskInput.collection);
  if (!schema) {
    throw new TranslatorConfigError(`Collection "${taskInput.collection}" not found in schemaMap`);
  }

  const versions = payload.collections[taskInput.collection].config.versions;
  const layer = resolveTargetLayer({ versions, targetLng: taskInput.targetLng });
  const target = {
    collection: taskInput.collection,
    documentId: taskInput.collectionId,
    sourceLocale: taskInput.sourceLng,
    targetLocale: taskInput.targetLng,
  };

  return {
    payload,
    target,
    scope,
    schema,
    layer,
    doc: await openTargetDocument({ payload, target, scope }),
  };
}
