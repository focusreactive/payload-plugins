import React from "react";

import { CardsGridBlockComponent } from "./CardsGrid/Component";
import { CarouselBlockComponent } from "./Carousel/Component";
import { ChartBlockComponent } from "./Chart/Component";
import { ContentBlockComponent } from "./Content/Component";
import { CtaBandBlockComponent } from "./CtaBand/Component";
import { FaqBlockComponent } from "./Faq/Component";
import { HeroBlockComponent } from "./Hero/Component";
import { LogosBlockComponent } from "./Logos/Component";
import { NewsletterBlockComponent } from "./Newsletter/Component";
import { RawHtmlBlockComponent } from "./RawHtml/Component";
import { StatsBlockComponent } from "./Stats/Component";
import { TestimonialsListBlockComponent } from "./TestimonialsList/Component";

export const contentBlockComponents = {
  cardsGrid: CardsGridBlockComponent,
  carousel: CarouselBlockComponent,
  chart: ChartBlockComponent,
  content: ContentBlockComponent,
  ctaBand: CtaBandBlockComponent,
  newsletter: NewsletterBlockComponent,
  stats: StatsBlockComponent,
  faq: FaqBlockComponent,
  hero: HeroBlockComponent,
  logos: LogosBlockComponent,
  rawHtml: RawHtmlBlockComponent,
  testimonialsList: TestimonialsListBlockComponent,
};

export type ContentBlockType = keyof typeof contentBlockComponents;

export function renderContentBlock(
  block: { blockType?: string | null; id?: string | null },
  key: React.Key
): React.ReactNode {
  const { blockType } = block;

  if (!blockType || !(blockType in contentBlockComponents)) return null;

  const Block = contentBlockComponents[
    blockType as ContentBlockType
  ] as unknown as React.ComponentType<Record<string, unknown>>;

  if (!Block) return null;

  return (
    <div key={key}>
      <Block {...block} />
    </div>
  );
}
