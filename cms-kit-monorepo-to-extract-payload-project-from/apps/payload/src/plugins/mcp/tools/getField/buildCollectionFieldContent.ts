import type { CollectionSlug, Payload } from "payload";

import { PRE_FORMATTED_CONTENT_INSTRUCTION } from "../../constants/instructions";
import type { ContentBlock } from "../../types";
import { buildLabelMaps } from "../../utils/field/buildLabelMaps";
import { formatDocumentField } from "../../utils/markdown/formatDocumentField";

interface Props {
  fieldPath: string;
  value: unknown;
  collection: CollectionSlug;
  documentId?: string;
  payload: Payload;
  raw?: boolean;
}

export function buildCollectionFieldContent({
  fieldPath,
  value,
  collection,
  documentId,
  payload,
  raw,
}: Props): ContentBlock[] {
  if (raw) {
    return [{ text: JSON.stringify(value, null, 2), type: "text" }];
  }

  const { fieldLabels, blockLabels, fieldRelationTo } = buildLabelMaps(
    collection,
    payload
  );

  const body = formatDocumentField(fieldPath, value, {
    blockLabels,
    collectionSlug: String(collection),
    documentId,
    fieldLabels,
    fieldRelationTo,
  });

  return [{ text: PRE_FORMATTED_CONTENT_INSTRUCTION + body, type: "text" }];
}
