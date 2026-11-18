"use client";

import { useConfig, useFormFields } from "@payloadcms/ui";
import { useMemo } from "react";

import { rowCountOf } from "../lib/formRows.js";
import { rowTypeLabelOf } from "../lib/labels.js";
import type { Translate } from "../lib/labels.js";
import { previewConfigOf, resolvePreview } from "../lib/preview.js";
import type { Preview } from "../lib/preview.js";
import type { RowLevel } from "../lib/resolveRowChain.js";

const useImageCollections = (): Set<string> => {
  const { config } = useConfig();
  return useMemo(
    () => new Set(config.collections.filter((c) => Boolean(c.upload)).map((c) => c.slug)),
    [config.collections]
  );
};

export const useRowPreview = (level: RowLevel | undefined, translate: Translate): Preview => {
  const imageCollections = useImageCollections();
  const serialized = useFormFields(([fields]) => {
    if (!level) {
      return "";
    }
    const select = previewConfigOf(level)?.select;
    const preview = resolvePreview({
      fields: level.fields,
      getRowCount: (relative) => rowCountOf(fields, `${level.rowPath}.${relative}`),
      getValue: (relative) => fields[`${level.rowPath}.${relative}`]?.value,
      isImageCollection: (slug) => imageCollections.has(slug),
      defaultSubtitle: rowTypeLabelOf(level, translate),
      translate,
      withBlockName: Boolean(level.block),
      ...(select ? { select } : {}),
    });
    return JSON.stringify(preview);
  });
  return serialized ? (JSON.parse(serialized) as Preview) : {};
};
