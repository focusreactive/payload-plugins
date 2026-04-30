"use client";

import type { DefaultCellComponentProps } from "payload";
import { Pill } from "@payloadcms/ui";

export function ReleaseActionCell({ cellData }: DefaultCellComponentProps) {
  const value = typeof cellData === "string" ? cellData : "";
  if (!value) return <span />;

  const label = value.charAt(0).toUpperCase() + value.slice(1);
  const pillStyle = value === "unpublish" ? "warning" : "success";

  return <Pill pillStyle={pillStyle as any}>{label}</Pill>;
}
