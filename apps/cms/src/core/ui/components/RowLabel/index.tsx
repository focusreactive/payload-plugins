"use client";

import type { RowLabelProps } from "@payloadcms/ui";
import { useRowLabel } from "@payloadcms/ui";

import type { Header } from "@/payload-types";

import { readPath } from "../readPath";

const generateRowLabel = (
  rowNumber: number | undefined,
  label: string | undefined | null,
  prefix = "Row"
) => {
  if (label) {
    return `${prefix} ${rowNumber !== undefined ? rowNumber + 1 : ""}: ${label}`;
  }
  return `${prefix} ${rowNumber !== undefined ? rowNumber + 1 : ""}`;
};

interface RowLabelData {
  label?: string | null;
}

type RowLabelExtendedProps = RowLabelProps & {
  prefix?: string;
  titleField?: string;
};

export const RowLabel: React.FC<RowLabelExtendedProps> = ({ prefix = "Row", titleField }) => {
  const data = useRowLabel<RowLabelData>();
  let label: string | undefined | null;
  if (titleField) {
    const resolved = readPath(data?.data as unknown, titleField);
    label = typeof resolved === "string" ? resolved : data?.data?.label;
  } else {
    label = data?.data?.label;
  }
  return generateRowLabel(data.rowNumber, label, prefix);
};

export const RowLabelGroupName: React.FC<RowLabelProps> = () => {
  const data = useRowLabel<NonNullable<Header["navItems"]>[number]>();
  return generateRowLabel(data.rowNumber, data?.data?.label);
};
