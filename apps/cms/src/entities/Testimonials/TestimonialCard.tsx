import { StarIcon } from "lucide-react";
import React from "react";

import { Media } from "@/core/ui";
import type { Media as MediaType, Testimonial } from "@/payload-types";

const StarRow: React.FC<{ rating: number | null | undefined }> = ({ rating }) => {
  const filled = typeof rating === "number" && rating > 0 ? Math.min(5, Math.round(rating)) : 5;

  return (
    <div className="flex gap-1" aria-label={`${filled} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} size={16} className={star <= filled ? "fill-primary text-primary" : "fill-muted text-muted"} aria-hidden />
      ))}
    </div>
  );
};

const Avatar: React.FC<{ avatar: (number | null) | MediaType | undefined; name: string }> = ({ avatar, name }) => {
  const hasImage = avatar !== null && avatar !== undefined && typeof avatar !== "number";

  if (hasImage) {
    return (
      <Media resource={avatar} htmlElement="div" className="size-[42px] shrink-0 overflow-hidden rounded-full" imgClassName="size-full object-cover" pictureClassName="block size-full" size="42px" />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary" aria-hidden>
      {initial}
    </span>
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

  const roleCompany = [testimonial.position, testimonial.company].filter(Boolean).join(" · ");

  return (
    <article className="flex w-[380px] shrink-0 flex-col gap-4 rounded-md border border-border bg-surface p-7">
      {showRating && <StarRow rating={testimonial.rating} />}

      {testimonial.content && <blockquote className="flex-1 font-display text-body-lg leading-relaxed text-foreground">&ldquo;{testimonial.content}&rdquo;</blockquote>}

      <footer className="mt-auto flex items-center gap-3 border-t border-border pt-5">
        {showAvatar && <Avatar avatar={testimonial.avatar} name={testimonial.author} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{testimonial.author}</p>
          {roleCompany && <p className="mt-0.5 truncate text-small text-muted-foreground">{roleCompany}</p>}
        </div>
      </footer>
    </article>
  );
};
