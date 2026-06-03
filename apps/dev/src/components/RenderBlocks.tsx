import { filterHiddenBlocks } from "../lib/section-visibility/filterHiddenBlocks";
import { CopySection } from "./blocks/CopySection";
import { HeroSection } from "./blocks/HeroSection";

type Block = { blockType: "hero"; title: string; description?: string; _hidden?: boolean | null } | { blockType: "copy"; text: string; _hidden?: boolean | null };

interface Props {
  blocks: Block[];
}

export function RenderBlocks({ blocks }: Props) {
  const visibleBlocks = filterHiddenBlocks(blocks);

  return (
    <>
      {visibleBlocks.map((block, i) => {
        if (block.blockType === "hero") {
          return <HeroSection key={i} title={block.title} description={block.description} />;
        }
        if (block.blockType === "copy") {
          return <CopySection key={i} text={block.text} />;
        }
        return null;
      })}
    </>
  );
}
