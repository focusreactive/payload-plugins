import React, { Fragment } from "react";

import type { Page } from "@/payload-types";

import { CardsGridBlockComponent } from "./CardsGrid/Component";
import { CarouselBlockComponent } from "./Carousel/Component";
import { ContentBlockComponent } from "./Content/Component";
import { FaqBlockComponent } from "./Faq/Component";
import { HeroBlockComponent } from "./Hero/Component";
import { LinksListBlockComponent } from "./LinksList/Component";
import { LogosBlockComponent } from "./Logos/Component";
import { TestimonialsListBlockComponent } from "./TestimonialsList/Component";
import { TextSectionBlockComponent } from "./TextSection/Component";

const blockComponents = {
  cardsGrid: CardsGridBlockComponent,
  carousel: CarouselBlockComponent,
  content: ContentBlockComponent,
  faq: FaqBlockComponent,
  hero: HeroBlockComponent,
  linksList: LinksListBlockComponent,
  logos: LogosBlockComponent,
  testimonialsList: TestimonialsListBlockComponent,
  textSection: TextSectionBlockComponent,
};

export const RenderBlocks: React.FC<{
  blocks: Page["blocks"][0][];
}> = (props) => {
  const { blocks } = props;

  const hasBlocks = blocks && Array.isArray(blocks) && blocks.length > 0;

  if (hasBlocks) {
    return (
      <Fragment>
        {blocks.map((block, index) => {
          const { blockType } = block;

          if (blockType && blockType in blockComponents) {
            const Block = blockComponents[blockType];

            if (Block) {
              return (
                <div key={index}>
                  {/* @ts-expect-error there may be some mismatch between the expected types here */}
                  <Block {...block} disableInnerContainer />
                </div>
              );
            }
          }
          return null;
        })}
      </Fragment>
    );
  }

  return null;
};
