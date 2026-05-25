import { Carousel } from "@shared/ui";
import type { ICarouselCardProps } from "@shared/ui/components/sections/carousel/types";
import React from "react";

import { SectionContainer } from "@/core/ui";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import type { CarouselBlock } from "@/payload-types";

export const CarouselBlockComponent: React.FC<CarouselBlock> = ({
  text,
  effect,
  slides,
  section,
  id,
}) => {
  const cards: ICarouselCardProps[] = (slides ?? []).map((slide) => ({
    effect: (effect as ICarouselCardProps["effect"]) ?? "slide",
    image: prepareImageProps(slide.image),
    text: slide.text ? prepareRichTextProps(slide.text) : undefined,
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <Carousel
        text={text ? prepareRichTextProps(text) : undefined}
        slides={cards}
        effect={(effect as ICarouselCardProps["effect"]) ?? "slide"}
      />
    </SectionContainer>
  );
};
