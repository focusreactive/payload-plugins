import { useConfig, useListQuery } from "@payloadcms/ui";
import type { Where } from "payload";
import { mergeListSearchAndWhere } from "payload/shared";
import { useMemo } from "react";

import type { DocumentId } from "../../../../../types/wire/primitives.js";

export type ListRow = { id: DocumentId; title: string };

export type ListView = {
  collection: string;
  /** The rows of the page on screen, in their order. */
  rows: readonly ListRow[];
  /** The search and the filters on screen, as one `where` over the whole collection. */
  where: Where;
};

const titleOf = (doc: Record<string, unknown>, field: string | undefined, id: DocumentId) => {
  const value = field ? doc[field] : undefined;
  return typeof value === "string" && value.length > 0 ? value : id;
};

/** The collection list Payload is showing, from inside it (a cell, or a slot above the table). */
export function useListView(): ListView {
  const { collectionSlug, data, query } = useListQuery();
  const { getEntityConfig } = useConfig();
  const collectionConfig = getEntityConfig({ collectionSlug });
  const useAsTitle = collectionConfig.admin.useAsTitle;

  return useMemo(() => {
    const docs: readonly Record<string, unknown>[] = data?.docs ?? [];
    const rows = docs.map((doc) => {
      const id = String(doc.id);
      return { id, title: titleOf(doc, useAsTitle, id) };
    });
    const where = mergeListSearchAndWhere({
      collectionConfig,
      search: query.search ?? "",
      where: query.where,
    });
    return { collection: collectionSlug, rows, where };
  }, [collectionSlug, collectionConfig, data, query.search, query.where, useAsTitle]);
}
