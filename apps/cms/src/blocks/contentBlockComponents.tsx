import React from "react";

import { WbAwardsBlockComponent } from "./WbAwards/Component";
import { WbBrandWorldsBlockComponent } from "./WbBrandWorlds/Component";
import { WbCommentAnalysisBlockComponent } from "./WbCommentAnalysis/Component";
import { WbEventsBlockComponent } from "./WbEvents/Component";
import { WbFeaturedBlockComponent } from "./WbFeatured/Component";
import { WbHeroBlockComponent } from "./WbHero/Component";
import { WbLatestNewsBlockComponent } from "./WbLatestNews/Component";
import { WbMoreStoriesBlockComponent } from "./WbMoreStories/Component";
import { WbPeopleMovesBlockComponent } from "./WbPeopleMoves/Component";
import { WbResearchBlockComponent } from "./WbResearch/Component";
import { WbSponsorsBlockComponent } from "./WbSponsors/Component";
import { WbSubscribeBlockComponent } from "./WbSubscribe/Component";

export const contentBlockComponents = {
  wbHero: WbHeroBlockComponent,
  wbAwards: WbAwardsBlockComponent,
  wbEvents: WbEventsBlockComponent,
  wbBrands: WbBrandWorldsBlockComponent,
  wbResearch: WbResearchBlockComponent,
  wbPeople: WbPeopleMovesBlockComponent,
  wbFeatured: WbFeaturedBlockComponent,
  wbNews: WbLatestNewsBlockComponent,
  wbAnalysis: WbCommentAnalysisBlockComponent,
  wbMoreRead: WbMoreStoriesBlockComponent,
  wbSponsors: WbSponsorsBlockComponent,
  wbSubscribe: WbSubscribeBlockComponent,
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
