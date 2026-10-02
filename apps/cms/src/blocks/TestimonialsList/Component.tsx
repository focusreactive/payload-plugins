import { SectionHeading, hasSectionHeading } from "@/components/SectionHeading";
import { cn } from "@/components/utils";
import React from "react";

import { AnimatedCarousel } from "@/components/Testimonials";
import type { Testimonial, TestimonialsListBlock } from "@/payload-types";
import { Container } from "@/components/shared/Container";
import { sectionVariants } from "@/components/shared/SectionContainer";

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

  const theme = section?.theme;

  return (
    <section
      id={id ?? undefined}
      className={cn(
        sectionVariants({ paddingY: section?.paddingY }),
        theme && "bg-background text-foreground",
        "relative overflow-hidden"
      )}
      {...(theme ? { "data-theme": theme } : {})}
    >
      {hasSectionHeading(heading) && (
        <Container containerData={{ maxWidth: section?.maxWidth, paddingX: section?.paddingX }}>
          <SectionHeading {...heading} align="center" className="mb-12 sm:mb-16" />
        </Container>
      )}

      <AnimatedCarousel
        testimonials={testimonials}
        showRating={showRating ?? true}
        showAvatar={showAvatar ?? true}
        duration={duration ?? 60}
      />
    </section>
  );
};
