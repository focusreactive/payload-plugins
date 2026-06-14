import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

import { filterHiddenBlocks } from "../lib/section-visibility/filterHiddenBlocks";
import { ContentSection } from "./blocks/ContentSection";
import { HeroSection } from "./blocks/HeroSection";

interface MediaImage {
  url?: string | null;
  alt?: string | null;
}

type Block =
  | {
      blockType: "hero";
      title: string;
      description?: string;
      image?: MediaImage | null;
      cta?: { label: string; url: string }[] | null;
      _hidden?: boolean | null;
    }
  | {
      blockType: "content";
      content: SerializedEditorState;
      image?: MediaImage | null;
      _hidden?: boolean | null;
    };

interface Props {
  blocks: Block[];
}

export function RenderBlocks({ blocks }: Props) {
  const visibleBlocks = filterHiddenBlocks(blocks);

  return (
    <>
      {visibleBlocks.map((block, i) => {
        if (block.blockType === "hero") {
          return <HeroSection cta={block.cta} description={block.description} image={block.image} key={i} title={block.title} />;
        }
        if (block.blockType === "content") {
          return <ContentSection content={block.content} image={block.image} key={i} />;
        }
        return null;
      })}
    </>
  );
}
