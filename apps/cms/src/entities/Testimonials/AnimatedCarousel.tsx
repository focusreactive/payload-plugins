import React from "react";

import type { Testimonial } from "@/payload-types";

import { TestimonialCard } from "./TestimonialCard";

interface AnimatedCarouselProps {
  testimonials: Testimonial[];
  showRating?: boolean;
  showAvatar?: boolean;
  duration?: number;
}

export const AnimatedCarousel: React.FC<AnimatedCarouselProps> = ({
  testimonials,
  showRating = true,
  showAvatar = true,
  duration = 60,
}) => {
  const valid = testimonials.filter(
    (t): t is Testimonial => typeof t !== "number" && t !== null && t !== undefined
  );

  if (valid.length === 0) {
    return null;
  }

  return (
    <div
      className="testimonials-carousel mask-shadow-y overflow-hidden"
      style={{ "--testimonials-carousel-duration": `${duration}s` } as React.CSSProperties}
    >
      <div className="flex w-max">
        <div className="testimonials-carousel-group flex gap-4 pr-4 will-change-transform">
          {valid.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              showRating={showRating}
              showAvatar={showAvatar}
            />
          ))}
        </div>

        <div
          aria-hidden
          className="testimonials-carousel-group flex gap-4 pr-4 will-change-transform"
        >
          {valid.map((testimonial, index) => (
            <TestimonialCard
              key={index}
              testimonial={testimonial}
              showRating={showRating}
              showAvatar={showAvatar}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
