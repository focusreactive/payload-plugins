import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { AlignVariant } from '@shared/ui/components/ui/richText/types';
import type { IRichTextProps } from '@shared/ui/components/ui/richText/types';
import React from "react";

import { RichText } from "@/core/ui";

export function prepareRichTextProps(
  content: SerializedEditorState | null | undefined,
  align: AlignVariant = AlignVariant.Left,
  removeInnerMargins = false
): IRichTextProps {
  return {
    alignVariant: align,
    removeInnerMargins,
    richText: content ? <RichText content={content} /> : null,
  };
}
