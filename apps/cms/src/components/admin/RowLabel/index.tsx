"use client";

import type { RowLabelProps } from "@payloadcms/ui";
import { useRowLabel, useTranslation } from "@payloadcms/ui";

import type { Header } from "@/payload-types";

import { readPath } from "../readPath";

const EMPTY_ROW_TEXT = { en: "Not filled in yet", es: "Aún sin rellenar" } as const;

const padRowNumber = (rowNumber: number | undefined) =>
  rowNumber === undefined ? "" : `${String(rowNumber + 1).padStart(2, "0")} · `;

/** "01 · Start free": the row's own text, or a muted hint while it is still empty. */
const useRowText = (label: string | undefined | null, rowNumber: number | undefined) => {
  const { i18n } = useTranslation();
  const empty = i18n.language === "es" ? EMPTY_ROW_TEXT.es : EMPTY_ROW_TEXT.en;
  return `${padRowNumber(rowNumber)}${label?.trim() || empty}`;
};

interface RowLabelData {
  label?: string | null;
}

type RowLabelExtendedProps = RowLabelProps & {
  titleField?: string;
};

export const RowLabel: React.FC<RowLabelExtendedProps> = ({ titleField }) => {
  const data = useRowLabel<RowLabelData>();
  let label: string | undefined | null;
  if (titleField) {
    const resolved = readPath(data?.data as unknown, titleField);
    label = typeof resolved === "string" ? resolved : data?.data?.label;
  } else {
    label = data?.data?.label;
  }
  return useRowText(label, data.rowNumber);
};

export const RowLabelGroupName: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Header["navItems"]>[number]>();
  return useRowText(data?.data?.label, data.rowNumber);
};
