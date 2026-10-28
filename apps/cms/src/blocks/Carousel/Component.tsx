import { SectionHeading } from "@/components/SectionHeading";
import { Carousel } from "./ui";
import type { ICarouselCardProps } from "./ui/types";
import React from "react";

import { SectionContainer } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import type { CarouselBlock } from "@/payload-types";

export const CarouselBlockComponent: React.FC<CarouselBlock> = ({
  heading,
  effect,
  slides,
  section,
  id,
}) => {
  const cards: ICarouselCardProps[] = (slides ?? []).map((slide) => ({
    effect: (effect as ICarouselCardProps["effect"]) ?? "slide",
    image: prepareMediaProps(slide.image),
    text: slide.text ? prepareRichTextProps(slide.text) : undefined,
  }));

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <SectionHeading {...heading} align="center" className="mb-12" />
      <Carousel slides={cards} effect={(effect as ICarouselCardProps["effect"]) ?? "slide"} />
    </SectionContainer>
  );
};
