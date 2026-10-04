"use client";

import { useState } from "react";

import { cn, resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { GridLines } from "@/components/GridLines";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

interface NewsletterSectionProps {
  header?: SectionHeaderProps | null;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
  theme?: string | null;
}

export function NewsletterSection({
  header,
  inputPlaceholder,
  buttonLabel,
  disclaimer,
  theme,
}: NewsletterSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const backdropTone = resolveBackdropTone(theme);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div>
      <AbstractBackdrop variant="orbs" tone={backdropTone} intensity="subtle" />
      <GridLines tone={backdropTone} />
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        {header && <SectionHeader {...header} align="center" className="max-w-[760px]" />}

        <div aria-live="polite" className="flex flex-col items-center gap-4">
          {submitted ? (
            <p className="text-lead font-medium">You&rsquo;re in. Talk soon.</p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-wrap items-center justify-center gap-3"
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
                  "min-h-11 min-w-[280px] rounded-md border border-transparent bg-white px-4",
                  "text-ct-grey-900 placeholder:text-ct-grey-600",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "text-base"
                )}
              />
              <button
                type="submit"
                className={cn(
                  "min-h-11 rounded-md bg-accent px-5",
                  "text-accent-foreground text-base font-semibold",
                  "transition-colors hover:bg-ct-white hover:text-ct-dark-blue focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                )}
              >
                {buttonLabel}
              </button>
            </form>
          )}
        </div>

        {disclaimer && <p className="text-small text-muted-foreground">{disclaimer}</p>}
      </div>
    </div>
  );
}
