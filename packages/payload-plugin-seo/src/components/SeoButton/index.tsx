"use client";

import { useDocumentInfo, useLocale } from "@payloadcms/ui";
import { isExistingDocument } from "./isExistingDocument";
import { RemoteKeyphrasesGate } from "./RemoteKeyphrasesGate";
import { SeoButtonInner } from "./SeoButtonInner";
import type { SeoButtonProps } from "./SeoButtonInner";

export type { SeoButtonProps };

export function SeoButton(props: SeoButtonProps) {
  const { id } = useDocumentInfo();
  const locale = useLocale();

  if (!isExistingDocument(id)) return null;
  if (props.keyphraseIndex) {
    return <RemoteKeyphrasesGate key={`${id}:${locale?.code}`} {...props} docId={String(id)} />;
  }

  return <SeoButtonInner {...props} />;
}

export default SeoButton;
