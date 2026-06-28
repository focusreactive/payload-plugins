import React, { Fragment } from "react";

import type { Page } from "@/payload-types";

import { filterHiddenBlocks } from "@/lib/fields/section/filterHiddenBlocks";

import { renderContentBlock } from "./contentBlockComponents";
import { GlobalSectionSlotBlockComponent } from "./GlobalSectionSlot/Component";

export const RenderBlocks: React.FC<{
  blocks: Page["blocks"][0][];
}> = (props) => {
  const { blocks } = props;

  const visibleBlocks = filterHiddenBlocks(blocks);
  const hasBlocks = visibleBlocks.length > 0;

  if (!hasBlocks) {
    return null;
  }

  return (
    <Fragment>
      {visibleBlocks.map((block, index) => {
        if (block.blockType === "globalSectionSlot") {
          return <GlobalSectionSlotBlockComponent key={index} {...block} />;
        }

        return renderContentBlock(block, index);
      })}
    </Fragment>
  );
};
