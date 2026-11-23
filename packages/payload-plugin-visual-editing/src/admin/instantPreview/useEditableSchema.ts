import { useConfig } from "@payloadcms/ui";
import { useMemo } from "react";

import { buildEditableSchema } from "../../shared/editableSchema/editableSchema.js";
import type { EditableSchema } from "../../shared/editableSchema/editableSchema.js";

type DocumentSlugs = { collectionSlug?: string; globalSlug?: string };

const NOTHING_EDITABLE: EditableSchema = buildEditableSchema([]);

export function useEditableSchema(
  { collectionSlug, globalSlug }: DocumentSlugs,
  excludeFieldNames: readonly string[] | undefined
): EditableSchema {
  const { config, getEntityConfig } = useConfig();
  const referencedBlocks = config.blocksMap;

  return useMemo(() => {
    const collection = collectionSlug ? getEntityConfig({ collectionSlug }) : null;
    const global = globalSlug ? getEntityConfig({ globalSlug }) : null;
    const fields = collection?.auth ? null : (collection ?? global)?.fields;
    if (!fields) return NOTHING_EDITABLE;
    return buildEditableSchema(fields, { excludeFieldNames, referencedBlocks });
  }, [collectionSlug, excludeFieldNames, getEntityConfig, globalSlug, referencedBlocks]);
}
