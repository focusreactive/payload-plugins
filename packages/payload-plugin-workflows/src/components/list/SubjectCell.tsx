"use client";

import { Link, useConfig, useListRelationships } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";
import { useEffect } from "react";

import { useWorkflowsT } from "../shared/useWorkflowsT.js";

/**
 * The workflows list's document cell: the run's document by its title, linked to its edit view
 * (`formatDocURL`). Titles load the way Payload's relationship cells load them: batched, over the
 * REST API, with the viewer's access; a document they cannot read shows as untitled.
 */
export const SubjectCell = ({ cellData, link, linkURL, rowData }: DefaultCellComponentProps) => {
  const { t } = useWorkflowsT();
  const { getEntityConfig } = useConfig();
  const { documents, getRelationships } = useListRelationships();
  const collection = String(rowData.subjectCollection);
  const id = String(cellData);

  useEffect(() => {
    getRelationships([{ relationTo: collection, value: id }]);
  }, [collection, id, getRelationships]);

  const doc = documents[collection]?.[id] as Record<string, unknown> | false | null | undefined;
  const field = getEntityConfig({ collectionSlug: collection })?.admin?.useAsTitle;
  const title = doc && field ? doc[field] : undefined;
  let text = "";
  if (typeof title === "string" || typeof title === "number") {
    text = String(title);
  } else if (doc !== null && doc !== undefined) {
    text = t("untitled", { id });
  }
  return link && linkURL ? (
    <Link href={linkURL} prefetch={false}>
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  );
};
