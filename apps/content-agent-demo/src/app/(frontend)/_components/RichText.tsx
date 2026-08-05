import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText as RichTextReact } from "@payloadcms/richtext-lexical/react";

export function RichText({ data }: { data: SerializedEditorState | null | undefined }) {
  if (!data) {
    return null;
  }

  return <RichTextReact data={data} />;
}
