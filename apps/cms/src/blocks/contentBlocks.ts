import type { Block } from "payload";

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

// The WealthBriefing site builds pages exclusively from the WB blocks.
export const contentBlocks: Block[] = [...wbBlocks];
