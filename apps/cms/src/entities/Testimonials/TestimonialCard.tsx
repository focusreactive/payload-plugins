import { StarIcon } from "lucide-react";

import { Media } from "@/core/ui";
import type { Testimonial } from "@/payload-types";

const Rating: React.FC<{ rating: number }> = ({ rating }) => {
  const numRating = typeof rating === "number" ? rating : Number(rating) || 0;

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} size={16} className={`transition-all duration-200 ${star <= numRating ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
      ))}
    </div>
  );
};

export const TestimonialCard: React.FC<{
  testimonial: Testimonial;
  showRating?: boolean;
  showAvatar?: boolean;
}> = ({ testimonial, showRating = true, showAvatar = true }) => {
  if (typeof testimonial === "number" || typeof testimonial === "string" || !testimonial) {
    return null;
  }

  return (
    <article className="testimonials-card flex h-full w-[280px] flex-col rounded-lg border border-white-10 bg-gray-900 p-7 sm:w-[340px] md:w-[400px] lg:w-[440px]">
      {showRating && testimonial.rating ? (
        <div className="mb-6">
          <Rating rating={testimonial.rating} />
        </div>
      ) : null}

      {testimonial.content && <p className="mb-6 flex-1 font-display text-xl italic leading-snug text-cream-50 lg:text-2xl">&ldquo;{testimonial.content}&rdquo;</p>}

      <div className="mt-auto flex items-center gap-4 border-t border-white-10 pt-5">
        {showAvatar && testimonial.avatar && typeof testimonial.avatar !== "number" && (
          <div className="shrink-0">
            <Media resource={testimonial.avatar} className="size-11 rounded-pill object-cover" imgClassName="rounded-pill object-cover h-full w-full" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-cream-50">{testimonial.author}</p>
          {(testimonial.position || testimonial.company) && <p className="mt-0.5 truncate text-xs text-gray-400">{[testimonial.position, testimonial.company].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>
    </article>
  );
};
