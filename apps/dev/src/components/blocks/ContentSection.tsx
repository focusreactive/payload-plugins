import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import { RichText } from "@payloadcms/richtext-lexical/react";
import React from "react";

interface MediaImage {
  url?: string | null;
  alt?: string | null;
}

interface Props {
  content: SerializedEditorState;
  image?: MediaImage | null;
}

export function ContentSection({ content, image }: Props) {
  return (
    <section style={{ borderBottom: "1px solid #eee", padding: "60px 40px" }}>
      <div style={{ fontSize: "1.125rem", lineHeight: 1.7 }}>
        <RichText data={content} />
      </div>
      {image?.url && (
        <img
          alt={image.alt ?? ""}
          src={image.url}
          style={{ borderRadius: 8, marginTop: 24, maxWidth: "100%" }}
        />
      )}
    </section>
  );
}
