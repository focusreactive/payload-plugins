import { Carousel, SectionHeader } from "@repo/ui";
import type { ICarouselCardProps } from "@repo/ui/components/sections/carousel/types";
import React from "react";

import { SectionContainer } from "@/core/ui";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { CarouselBlock } from "@/payload-types";

export const CarouselBlockComponent: React.FC<CarouselBlock> = ({ eyebrow, heading, lead, effect, slides, section, id }) => {
  const cards: ICarouselCardProps[] = (slides ?? []).map((slide) => ({
    effect: (effect as ICarouselCardProps["effect"]) ?? "slide",
    image: prepareImageProps(slide.image),
    text: slide.text ? prepareRichTextProps(slide.text) : undefined,
  }));

  const header = prepareSectionHeaderProps({
    eyebrow,
    subtitle: lead,
    title: heading,
    align: "center",
  });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-12" />}
      <Carousel slides={cards} effect={(effect as ICarouselCardProps["effect"]) ?? "slide"} />
    </SectionContainer>
  );
};
