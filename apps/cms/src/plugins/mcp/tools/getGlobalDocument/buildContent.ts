import type { GlobalSlug, Payload } from "payload";

import { getServerSideURL } from "@/core/lib/getURL";
import type { Locale } from "@/core/types";

import { PRE_FORMATTED_CONTENT_INSTRUCTION } from "../../constants/instructions";
import type { BaseDocument, ContentBlock } from "../../types";
import { buildLabelMaps } from "../../utils/field/buildLabelMaps";
import { extractFields } from "../../utils/field/extractFields";
import { formatDocument } from "../../utils/markdown/formatDocument";
import { resolvePath } from "../../utils/resolvePath";

interface Props {
  doc: BaseDocument;
  skipKeys: Set<string>;
  slug: GlobalSlug;
  titleField?: string;
  payload: Payload;
  full?: boolean;
  raw?: boolean;
  locale?: Locale;
}

function resolveGlobalTitle(
  doc: BaseDocument,
  titleField: string | undefined,
  slug: GlobalSlug
) {
  if (titleField) {
    const result = resolvePath(doc, titleField);

    if (
      !("error" in result) &&
      result.value !== null &&
      result.value !== undefined &&
      typeof result.value !== "object"
    ) {
      return String(result.value);
    }
  }

  return String(slug);
}

export function buildContent({
  doc,
  skipKeys,
  slug,
  titleField,
  payload,
  full,
  raw,
  locale,
}: Props): ContentBlock[] {
  if (raw) {
    return [{ text: JSON.stringify(doc, null, 2), type: "text" }];
  }

  const title = resolveGlobalTitle(doc, titleField, slug);
  const adminUrl = `${getServerSideURL()}/admin/globals/${slug}${locale ? `?locale=${locale}` : ""}`;
  const extractedDoc = extractFields(doc, skipKeys);
  const { fieldLabels, blockLabels, fieldRelationTo } = buildLabelMaps(
    slug,
    payload,
    "global"
  );

  const body = formatDocument({
    adminUrl,
    blockLabels,
    collectionSlug: String(slug),
    extractedDoc,
    fieldLabels,
    fieldRelationTo,
    summarizeComplexValues: !full,
    title,
    titleIsId: false,
  });

  return [{ text: PRE_FORMATTED_CONTENT_INSTRUCTION + body, type: "text" }];
}
