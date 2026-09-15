import React from "react";

import { BookOfferBlockComponent } from "./BookOffer/Component";
import { CardsGridBlockComponent } from "./CardsGrid/Component";
import { CarouselBlockComponent } from "./Carousel/Component";
import { ChartBlockComponent } from "./Chart/Component";
import { ContentBlockComponent } from "./Content/Component";
import { CourseRailBlockComponent } from "./CourseRail/Component";
import { CtaBandBlockComponent } from "./CtaBand/Component";
import { FaqBlockComponent } from "./Faq/Component";
import { HeroBlockComponent } from "./Hero/Component";
import { HeroSpotlightBlockComponent } from "./HeroSpotlight/Component";
import { LogosBlockComponent } from "./Logos/Component";
import { MembershipTiersBlockComponent } from "./MembershipTiers/Component";
import { NewsletterBlockComponent } from "./Newsletter/Component";
import { PortraitFeatureBlockComponent } from "./PortraitFeature/Component";
import { RawHtmlBlockComponent } from "./RawHtml/Component";
import { ShopifyCarouselBlockComponent } from "./ShopifyCarousel/Component";
import { ShopifyProductBlockComponent } from "./ShopifyProduct/Component";
import { SidebarSectionBlockComponent } from "./SidebarSection/Component";
import { StatsBlockComponent } from "./Stats/Component";
import { TalkGridBlockComponent } from "./TalkGrid/Component";
import { TestimonialsListBlockComponent } from "./TestimonialsList/Component";
import { TopicChipsBlockComponent } from "./TopicChips/Component";

export const contentBlockComponents = {
  bookOffer: BookOfferBlockComponent,
  cardsGrid: CardsGridBlockComponent,
  carousel: CarouselBlockComponent,
  chart: ChartBlockComponent,
  content: ContentBlockComponent,
  courseRail: CourseRailBlockComponent,
  ctaBand: CtaBandBlockComponent,
  newsletter: NewsletterBlockComponent,
  stats: StatsBlockComponent,
  faq: FaqBlockComponent,
  hero: HeroBlockComponent,
  heroSpotlight: HeroSpotlightBlockComponent,
  membershipTiers: MembershipTiersBlockComponent,
  logos: LogosBlockComponent,
  portraitFeature: PortraitFeatureBlockComponent,
  rawHtml: RawHtmlBlockComponent,
  testimonialsList: TestimonialsListBlockComponent,
  shopifyCarousel: ShopifyCarouselBlockComponent,
  shopifyProduct: ShopifyProductBlockComponent,
  sidebarSection: SidebarSectionBlockComponent,
  talkGrid: TalkGridBlockComponent,
  topicChips: TopicChipsBlockComponent,
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
