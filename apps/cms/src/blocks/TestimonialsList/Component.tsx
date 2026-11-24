import React from "react";

import { SectionHeading } from "@/components/SectionHeading";
import { SectionContainer } from "@/components/shared";
import { TestimonialCard, TestimonialsSlider } from "@/components/Testimonials";
import type { Testimonial, TestimonialsListBlock } from "@/payload-types";

type Props = TestimonialsListBlock;

export const TestimonialsListBlockComponent: React.FC<Props> = ({
  heading,
  testimonialItems,
  showRating = true,
  showAvatar = true,
  duration = 60,
  section,
  id,
}) => {
  const testimonials = (testimonialItems ?? [])
    .map((item) => item.testimonial)
    .filter((t): t is Testimonial => typeof t !== "number" && t !== null && t !== undefined);

  return (
    <SectionContainer sectionData={{ ...section, id }} className="overflow-x-clip">
      <SectionHeading {...heading} align="split" className="mb-sectionGap" />
      <TestimonialsSlider duration={duration ?? 0}>
        {testimonials.map((testimonial) => (
          <TestimonialCard
            key={testimonial.id}
            testimonial={testimonial}
            showRating={showRating ?? true}
            showAvatar={showAvatar ?? true}
          />
        ))}
      </TestimonialsSlider>
    </SectionContainer>
  );
};
