import React from "react";

import { CopySection } from "./blocks/CopySection";
import { HeroSection } from "./blocks/HeroSection";

type Block =
  | { blockType: "hero"; title: string; description?: string }
  | { blockType: "copy"; text: string };

interface Props {
  blocks: Block[];
}

export function RenderBlocks({ blocks }: Props) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.blockType === "hero") {
          return (
            <HeroSection
              key={i}
              title={block.title}
              description={block.description}
            />
          );
        }
        if (block.blockType === "copy") {
          return <CopySection key={i} text={block.text} />;
        }
        return null;
      })}
    </>
  );
}
