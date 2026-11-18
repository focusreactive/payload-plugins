import { LiveRichText, liveRichTextOf } from "@focus-reactive/payload-plugin-visual-editing/client";

import { resolveLocale } from "@/lib/utils/resolveLocale";

import { RichTextBody } from "./Body";
import type { RichTextProps } from "./Body";
import { renderUnsavedRichText } from "./renderUnsavedRichText";

export const RichText = async ({ content, className, variant }: RichTextProps) => {
  if (!content) {
    return null;
  }

  const locale = await resolveLocale();
  const body = (
    <RichTextBody content={content} className={className} locale={locale} variant={variant} />
  );
  const liveRichText = liveRichTextOf(content);
  if (!liveRichText) {
    return body;
  }

  return (
    <LiveRichText
      {...liveRichText}
      action={renderUnsavedRichText.bind(null, { className, locale, variant })}
    >
      {body}
    </LiveRichText>
  );
};
