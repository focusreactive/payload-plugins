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
import { StatsBlock } from "./Stats/config";
import { TestimonialsListBlock } from "./TestimonialsList/config";
// WealthBriefing homepage blocks
import { WbAnalysisBlock } from "./WbCommentAnalysis/config";
import { WbAwardsBlock } from "./WbAwards/config";
import { WbBrandsBlock } from "./WbBrandWorlds/config";
import { WbEventsBlock } from "./WbEvents/config";
import { WbFeaturedBlock } from "./WbFeatured/config";
import { WbHeroBlock } from "./WbHero/config";
import { WbMoreReadBlock } from "./WbMoreStories/config";
import { WbNewsBlock } from "./WbLatestNews/config";
import { WbPeopleBlock } from "./WbPeopleMoves/config";
import { WbResearchBlock } from "./WbResearch/config";
import { WbSponsorsBlock } from "./WbSponsors/config";
import { WbSubscribeBlock } from "./WbSubscribe/config";

export const wbBlocks: Block[] = [
  WbHeroBlock,
  WbAwardsBlock,
  WbEventsBlock,
  WbBrandsBlock,
  WbResearchBlock,
  WbPeopleBlock,
  WbFeaturedBlock,
  WbNewsBlock,
  WbAnalysisBlock,
  WbMoreReadBlock,
  WbSponsorsBlock,
  WbSubscribeBlock,
];

export const contentBlocks: Block[] = [
  ...wbBlocks,
  HeroBlock,
  ContentBlock,
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
