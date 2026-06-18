"use client";

import { useDocumentInfo } from "@payloadcms/ui";
import { isExistingDocument } from "./isExistingDocument";
import { SeoButtonInner } from "./SeoButtonInner";
import type { SeoButtonProps } from "./SeoButtonInner";

export type { SeoButtonProps };

export function SeoButton(props: SeoButtonProps) {
  const { id } = useDocumentInfo();

  if (!isExistingDocument(id)) return null;

  return <SeoButtonInner {...props} />;
}

export default SeoButton;
