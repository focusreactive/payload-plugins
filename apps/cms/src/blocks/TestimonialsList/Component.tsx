import { cn, SectionHeader } from "@/components/ui";
import React from "react";

import { AnimatedCarousel } from "@/entities";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";
import type { Testimonial, TestimonialsListBlock } from "@/payload-types";
import { Container } from "@/components/shared/blocks/Container";
import { sectionVariants } from "@/components/shared/blocks/SectionContainer";

type Props = TestimonialsListBlock;

export const TestimonialsListBlockComponent: React.FC<Props> = ({ eyebrow, heading, description, testimonialItems, showRating = true, showAvatar = true, duration = 60, section, id }) => {
  const testimonials = (testimonialItems ?? []).map((item) => item.testimonial).filter((t): t is Testimonial => typeof t !== "number" && t !== null && t !== undefined);
  const header = prepareSectionHeaderProps({
    align: "center",
    eyebrow,
    description,
    heading,
  });

  const theme = section?.theme;

  return (
    <section
      id={id ?? undefined}
      className={cn(sectionVariants({ paddingY: section?.paddingY }), theme && "bg-background text-foreground", "relative overflow-hidden")}
      {...(theme ? { "data-theme": theme } : {})}
    >
      {header && (
        <Container containerData={{ maxWidth: section?.maxWidth, paddingX: section?.paddingX }}>
          <SectionHeader {...header} className="mb-12 sm:mb-16" />
        </Container>
      )}

      <AnimatedCarousel testimonials={testimonials} showRating={showRating ?? true} showAvatar={showAvatar ?? true} duration={duration ?? 60} />
    </section>
  );
};
