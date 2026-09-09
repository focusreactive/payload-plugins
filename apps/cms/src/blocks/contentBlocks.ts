import type { Block } from "payload";

import { CardsGridBlock } from "./CardsGrid/config";
import { CarouselBlock } from "./Carousel/config";
import { ChartBlock } from "./Chart/config";
import { ContentBlock } from "./Content/config";
import { CtaBandBlock } from "./CtaBand/config";
import { FaqBlock } from "./Faq/config";
import { HeroBlock } from "./Hero/config";
import { LogosBlock } from "./Logos/config";
import { NewsletterBlock } from "./Newsletter/config";
import { RawHtmlBlock } from "./RawHtml/config";
import { ShopifyCarouselBlock } from "./ShopifyCarousel/config";
import { ShopifyProductBlock } from "./ShopifyProduct/config";
import { SidebarSectionBlock } from "./SidebarSection/config";
import { StatsBlock } from "./Stats/config";
import { TalkGridBlock } from "./TalkGrid/config";
import { TestimonialsListBlock } from "./TestimonialsList/config";
import { TopicChipsBlock } from "./TopicChips/config";

export const contentBlocks: Block[] = [
  HeroBlock,
  ContentBlock,
  TalkGridBlock,
  TopicChipsBlock,
  SidebarSectionBlock,
  ShopifyProductBlock,
  ShopifyCarouselBlock,
  FaqBlock,
  TestimonialsListBlock,
  CardsGridBlock,
  CarouselBlock,
  LogosBlock,
  ChartBlock,
  CtaBandBlock,
  NewsletterBlock,
  StatsBlock,
  RawHtmlBlock,
];
