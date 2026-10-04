import type { Block } from "payload";

import { CardsGridBlock } from "./CardsGrid/config";
import { CaseStudiesBlock } from "./CaseStudies/config";
import { CarouselBlock } from "./Carousel/config";
import { ChartBlock } from "./Chart/config";
import { ContentBlock } from "./Content/config";
import { CtaBandBlock } from "./CtaBand/config";
import { FaqBlock } from "./Faq/config";
import { FormBlock } from "./Form/config";
import { HeroBlock } from "./Hero/config";
import { LogosBlock } from "./Logos/config";
import { NewsletterBlock } from "./Newsletter/config";
import { PostsListBlock } from "./PostsList/config";
import { RawHtmlBlock } from "./RawHtml/config";
import { StatsBlock } from "./Stats/config";
import { TestimonialsListBlock } from "./TestimonialsList/config";
import { VideoEmbedBlock } from "./VideoEmbed/config";

export const contentBlocks: Block[] = [
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
  PostsListBlock,
  CaseStudiesBlock,
  FormBlock,
  VideoEmbedBlock,
  RawHtmlBlock,
];
