import React from "react";

import type { Testimonial } from "@/payload-types";

import { TestimonialCard } from "./TestimonialCard";

interface TestimonialsGridProps {
  testimonials: Testimonial[];
  showRating?: boolean;
  showAvatar?: boolean;
}

/**
 * A static grid, not a marquee: DESIGN.md bans auto-scrolling carousels outright ("no marquee"),
 * so the infinite CSS loop this replaced had to go, not just its colours.
 */
export const TestimonialsGrid: React.FC<TestimonialsGridProps> = ({
  testimonials,
  showRating = true,
  showAvatar = true,
}) => {
  const valid = testimonials.filter(
    (t): t is Testimonial => typeof t !== "number" && t !== null && t !== undefined
  );

  if (valid.length === 0) {
    return null;
  }

  return (
    <div className="not-prose grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {valid.map((testimonial, index) => (
        <TestimonialCard
          key={index}
          testimonial={testimonial}
          showRating={showRating}
          showAvatar={showAvatar}
        />
      ))}
    </div>
  );
};
