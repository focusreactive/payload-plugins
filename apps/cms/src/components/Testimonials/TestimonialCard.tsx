import { Sparkle } from "lucide-react";
import React from "react";

import { Media } from "@/components/media";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Media as MediaType, Testimonial } from "@/payload-types";

const StarRow: React.FC<{ rating: number | null | undefined }> = ({ rating }) => {
  const filled = typeof rating === "number" && rating > 0 ? Math.min(5, Math.round(rating)) : 5;

  return (
    <div className="flex" aria-label={`${filled} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Sparkle
          key={star}
          size={24}
          strokeWidth={0}
          className={star <= filled ? "fill-foreground" : "fill-border-strong"}
          aria-hidden
        />
      ))}
    </div>
  );
};

const Avatar: React.FC<{ avatar: (number | null) | MediaType | undefined; name: string }> = ({
  avatar,
  name,
}) => {
  const hasImage = avatar !== null && avatar !== undefined && typeof avatar !== "number";

  if (hasImage) {
    const media = prepareMediaProps({ image: avatar });
    return (
      <Media
        {...media.data}
        visualEditing={media.visualEditing}
        htmlElement="div"
        className="size-11 shrink-0 overflow-hidden rounded-pill"
        imageProps={{
          ...media.imageProps,
          className: "size-full object-cover",
          pictureClassName: "block size-full",
          sizes: "44px",
        }}
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <span
      className="flex size-11 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-surface text-body font-semibold text-foreground"
      aria-hidden
    >
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
    <article className="flex flex-col gap-8 overflow-clip rounded-2xl border border-border-strong bg-surface p-8 text-foreground md:gap-10 md:p-10 md:pr-12 md:pb-12">
      {showRating && <StarRow rating={testimonial.rating} />}
      {testimonial.content && (
        <blockquote className="pb-6 text-quote [text-indent:-0.45em]">
          &ldquo;{testimonial.content}&rdquo;
        </blockquote>
      )}
      <footer className="flex items-center gap-4">
        {showAvatar && <Avatar avatar={testimonial.avatar} name={testimonial.author} />}
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-body leading-5">
          <p className="truncate text-foreground">{testimonial.author}</p>
          {roleCompany && <p className="truncate text-subtle-foreground">{roleCompany}</p>}
        </div>
      </footer>
    </article>
  );
};
