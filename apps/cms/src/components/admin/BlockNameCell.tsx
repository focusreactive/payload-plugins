"use client";

import { getTranslation } from "@payloadcms/translations";
import { useTranslation } from "@payloadcms/ui";
import type { BlocksFieldClient, DefaultCellComponentProps } from "payload";

export const BlockNameCell = ({
  cellData,
  field,
}: DefaultCellComponentProps<BlocksFieldClient>) => {
  const { i18n } = useTranslation();

  const blockType = cellData?.[0]?.blockType;
  if (!blockType) return null;

  const label = field.blocks?.find((block) => block.slug === blockType)?.labels?.singular;

  return <span>{label ? getTranslation(label, i18n) : blockType}</span>;
};
