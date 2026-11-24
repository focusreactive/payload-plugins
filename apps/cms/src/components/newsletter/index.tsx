"use client";

import { useState } from "react";

import { cn } from "@/components/utils";
import { buttonVariants } from "@/components/button";
import { ButtonSize, ButtonVariant } from "@/components/button/types";
import type { SectionHeadingContent } from "@/components/SectionHeading";
import { SectionHeading } from "@/components/SectionHeading";

interface NewsletterSectionProps {
  heading?: SectionHeadingContent | null;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
}

export function NewsletterSection({
  heading,
  inputPlaceholder,
  buttonLabel,
  disclaimer,
}: NewsletterSectionProps) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="flex flex-col items-center gap-12 text-center">
      <SectionHeading {...heading} align="center" />

      <div aria-live="polite" className="flex w-full flex-col items-center gap-6">
        {submitted ? (
          <p className="text-lead font-medium">You&rsquo;re in. Talk soon.</p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-[640px] flex-col items-stretch gap-2 rounded-[2.5rem] border border-border bg-surface p-2 backdrop-blur-[20px] sm:flex-row sm:items-center sm:rounded-pill"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              name="email"
              required
              placeholder={inputPlaceholder}
              className={cn(
                "min-w-0 flex-1 rounded-pill border border-transparent bg-transparent px-6 py-4",
                "text-body-lg text-foreground placeholder:text-subtle-foreground",
                "outline-none focus-visible:border-border-strong"
              )}
            />
            <button
              type="submit"
              className={buttonVariants({ size: ButtonSize.Large, variant: ButtonVariant.Accent })}
            >
              {buttonLabel}
            </button>
          </form>
        )}
        {disclaimer && <p className="text-small text-subtle-foreground">{disclaimer}</p>}
      </div>
    </div>
  );
}
