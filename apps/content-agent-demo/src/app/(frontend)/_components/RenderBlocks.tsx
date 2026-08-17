import type { Page } from "@/payload-types";

import { Content } from "./blocks/Content";
import { Cta } from "./blocks/Cta";
import { Faq } from "./blocks/Faq";
import { Hero } from "./blocks/Hero";

export function RenderBlocks({ blocks }: { blocks: Page["blocks"] }) {
  if (!blocks?.length) {
    return null;
  }

  return (
    <>
      {blocks.map((block, index) => {
        const key = block.id ?? `${block.blockType}-${index}`;

        switch (block.blockType) {
          case "hero":
            return <Hero block={block} key={key} />;
          case "content":
            return <Content block={block} key={key} />;
          case "faq":
            return <Faq block={block} key={key} />;
          case "cta":
            return <Cta block={block} key={key} />;
          default:
            return null;
        }
      })}
    </>
  );
}
