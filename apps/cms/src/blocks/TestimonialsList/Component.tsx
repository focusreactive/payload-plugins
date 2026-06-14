import { SectionHeader } from "@repo/ui";
import React from "react";

import { SectionContainer } from "@/core/ui";
import { AnimatedCarousel } from "@/entities";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { Testimonial, TestimonialsListBlock } from "@/payload-types";

type Props = TestimonialsListBlock;

export const TestimonialsListBlockComponent: React.FC<Props> = ({ eyebrow, heading, lead, testimonialItems, showRating = true, showAvatar = true, duration = 60, section, id }) => {
  const testimonials = (testimonialItems ?? []).map((item) => item.testimonial).filter((t): t is Testimonial => typeof t !== "number" && t !== null && t !== undefined);
  const header = prepareSectionHeaderProps({ align: "center", eyebrow, subtitle: lead, title: heading });

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      {header && <SectionHeader {...header} className="mb-12 sm:mb-16" />}
      <AnimatedCarousel testimonials={testimonials} showRating={showRating ?? true} showAvatar={showAvatar ?? true} duration={duration ?? 60} />
    </SectionContainer>
  );
};
