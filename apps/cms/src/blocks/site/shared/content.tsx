import React from "react";

import type { SiteButton } from "@/components/site/SiteButton";
import type { SiteImage } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText, hasRichText } from "@/components/site/SiteRichText";

export type RichTextData = Parameters<typeof SiteRichText>[0]["data"];

/** Rich text from a block, or plain text from a record field. */
export type TextOrRichText = RichTextData | string | null | undefined;

export type MediaValue = Parameters<typeof SiteImage>[0]["media"];

export type SiteButtonValue = Parameters<typeof SiteButton>[0]["button"];

export const hasText = (value: TextOrRichText): boolean =>
  typeof value === "string" ? value.trim().length > 0 : hasRichText(value);

/** The content of a heading element: plain text as it is, rich text with its marks. */
export function HeadingText({ value }: { value: TextOrRichText }) {
  return typeof value === "string" ? value : <InlineRichText data={value} />;
}

/** Running text: plain text as one paragraph, rich text as its own paragraphs and lists. */
export function BodyText({ value, locale }: { value: TextOrRichText; locale: string }) {
  if (typeof value === "string") {
    return value.trim() ? <p>{value}</p> : null;
  }

  return <SiteRichText data={value} locale={locale} />;
}

/** Text typed on several lines, with a `br` where each line ends. */
export function LineBreaks({ value }: { value: string }) {
  const lines = value.split(/\r?\n/u);

  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          {line}
        </React.Fragment>
      ))}
    </>
  );
}
