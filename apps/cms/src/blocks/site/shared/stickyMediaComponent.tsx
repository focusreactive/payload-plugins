import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage, mediaOf } from "@/components/site/SiteImage";
import {
  InlineRichText,
  SiteRichText,
  hasRichText,
  richTextTarget,
} from "@/components/site/SiteRichText";
import { siteLinkHref } from "@/lib/site/links";
import type { StickyMediaBlock } from "@/payload-types";

import type { SiteBlockProps } from "../types";
import { StickyMediaAside } from "./stickyMediaAside";
import { SmallPrint } from "./stickyMediaSmallPrint";

type Chapter = NonNullable<StickyMediaBlock["chapters"]>[number];

function ChapterNote({ note, size }: Pick<Chapter, "note"> & { size: Chapter["noteSize"] }) {
  if (!hasRichText(note)) {
    return null;
  }

  const line = <InlineRichText data={note} />;

  return size === "small" ? (
    <SmallPrint target={richTextTarget(note)}>{line}</SmallPrint>
  ) : (
    <p {...richTextTarget(note)}>{line}</p>
  );
}

export function StickyMediaComponent({ chapters, locale }: SiteBlockProps<StickyMediaBlock>) {
  const rows = (chapters ?? []).map((chapter, index) => ({
    ...chapter,
    key: chapter.id ?? String(index),
  }));

  return (
    <section className="text_sticky_media">
      <div className="container">
        <div className="sticky_section_left">
          {rows.map((chapter, index) => (
            <div className="sticky_section_copy" data-position={index} key={chapter.key}>
              {mediaOf(chapter.image) && (
                <figure
                  className={
                    chapter.hideOnMobile
                      ? "sticky_section_image hide-mobile"
                      : "sticky_section_image"
                  }
                >
                  <SiteImage media={chapter.image} />
                </figure>
              )}
              <SiteRichText data={chapter.text} locale={locale} />
              {chapter.button?.text && siteLinkHref(chapter.button.link, locale) && (
                <p>
                  <SiteButton button={chapter.button} locale={locale} />
                </p>
              )}
              <ChapterNote note={chapter.note} size={chapter.noteSize} />
            </div>
          ))}
        </div>
        <StickyMediaAside
          pictures={rows.map((chapter) => ({
            id: chapter.key,
            picture: <SiteImage media={chapter.image} />,
          }))}
        />
      </div>
    </section>
  );
}
