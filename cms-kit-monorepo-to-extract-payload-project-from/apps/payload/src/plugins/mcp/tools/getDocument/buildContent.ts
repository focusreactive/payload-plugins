import type { CollectionSlug, Payload } from "payload";

import { getServerSideURL } from "@/core/lib/getURL";
import type { Locale } from "@/core/types";

import { PRE_FORMATTED_CONTENT_INSTRUCTION } from "../../constants/instructions";
import type { BaseDocument, ContentBlock } from "../../types";
import { buildLabelMaps } from "../../utils/field/buildLabelMaps";
import { extractFields } from "../../utils/field/extractFields";
import { formatDocument } from "../../utils/markdown/formatDocument";
import { resolveTitleField } from "../../utils/resolveTitleField";

interface Props {
  doc: BaseDocument;
  skipKeys: Set<string>;
  collection: CollectionSlug;
  titleField?: string;
  payload: Payload;
  full?: boolean;
  raw?: boolean;
  locale?: Locale;
  buildUrl?: (doc: BaseDocument, locale?: Locale) => string | null;
}

export function buildContent({
  doc,
  skipKeys,
  collection,
  titleField,
  payload,
  full,
  raw,
  locale,
  buildUrl,
}: Props): ContentBlock[] {
  if (raw) {
    return [{ text: JSON.stringify(doc, null, 2), type: "text" }];
  }

  const title = resolveTitleField(doc, titleField);
  const titleIsId = titleField === "id" || !titleField;

  const url = buildUrl ? buildUrl(doc, locale) : null;
  const adminUrl =
    doc.id && collection
      ? `${getServerSideURL()}/admin/collections/${collection}/${doc.id}${locale ? `?locale=${locale}` : ""}`
      : null;

  const extractedDoc = extractFields(doc, skipKeys);

  const { fieldLabels, blockLabels, fieldRelationTo } = buildLabelMaps(
    collection,
    payload
  );

  const body = formatDocument({
    adminUrl,
    blockLabels,
    collectionSlug: collection,
    extractedDoc,
    fieldLabels,
    fieldRelationTo,
    id: doc.id as string,
    summarizeComplexValues: !full,
    title,
    titleIsId,
    url,
  });

  return [{ text: PRE_FORMATTED_CONTENT_INSTRUCTION + body, type: "text" }];
}
