import { LiveRichText, liveRichTextOf } from "@focus-reactive/payload-plugin-visual-editing/client";

import { RichTextBody } from "./Body";
import type { RichTextBodyProps } from "./Body";
import { renderUnsavedRichText } from "./renderUnsavedRichText";

export const RichText = ({ content, className, variant }: RichTextBodyProps) => {
  if (!content) {
    return null;
  }

  const body = <RichTextBody content={content} className={className} variant={variant} />;
  const liveRichText = liveRichTextOf(content);
  if (!liveRichText) {
    return body;
  }

  return (
    <LiveRichText
      {...liveRichText}
      action={renderUnsavedRichText.bind(null, { className, variant })}
    >
      {body}
    </LiveRichText>
  );
};
