"use client";

import { useDocumentTitle, useForm } from "@payloadcms/ui";
import { useCallback } from "react";

import type { CrumbLevel } from "../lib/breadcrumbs.js";
import { rowCountOf } from "../lib/formRows.js";
import { blockLabelOf, fieldLabelOf, rowLabelOf } from "../lib/labels.js";
import type { Translate } from "../lib/labels.js";
import type { RowLevel } from "../lib/resolveRowChain.js";
import { useDocumentEntity } from "./useRowChainResolver.js";

export const useCrumbLevels = (
  levels: readonly RowLevel[],
  translate: Translate
): { crumbLevels: CrumbLevel[]; documentTitle: string } => {
  const { getFields } = useForm();
  const { title } = useDocumentTitle();
  const entity = useDocumentEntity();
  const getValue = useCallback((path: string) => getFields()[path]?.value, [getFields]);
  const getRowCount = useCallback((path: string) => rowCountOf(getFields(), path), [getFields]);

  const crumbLevels = levels.map((level): CrumbLevel => {
    const row = rowLabelOf(level, translate, getValue, getRowCount);
    const rowHint = blockLabelOf(level, translate);
    return {
      fieldLabel: fieldLabelOf(level, translate),
      rowLabel: row.title ?? row.label,
      rowPath: level.rowPath,
      ...(rowHint ? { rowHint } : {}),
    };
  });
  const entityLabel = (entity as { labels?: { singular?: unknown } } | null)?.labels?.singular;
  const documentTitle = title || translate(entityLabel) || "Document";

  return { crumbLevels, documentTitle };
};
