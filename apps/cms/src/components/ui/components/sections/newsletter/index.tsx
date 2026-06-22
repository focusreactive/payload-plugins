"use client";

import { useState } from "react";

import { cn, resolveBackdropTone } from "../../../utils";
import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { GridLines } from "../../ui/GridLines";
import type { SectionHeaderProps } from "../../ui/SectionHeader";
import { SectionHeader } from "../../ui/SectionHeader";

interface NewsletterSectionProps {
  header?: SectionHeaderProps | null;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
  theme?: string | null;
}

export function NewsletterSection({ header, inputPlaceholder, buttonLabel, disclaimer, theme }: NewsletterSectionProps) {
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
            <form onSubmit={handleSubmit} className="flex flex-wrap items-center justify-center gap-3">
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
                  "min-w-[280px] rounded-pill border border-transparent bg-white px-5 py-3.5",
                  "text-ink-950 placeholder:text-slate-500",
                  "outline-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-accent",
                  "text-base"
                )}
              />
              <button
                type="submit"
                className={cn(
                  "rounded-pill bg-accent px-6 py-3.5",
                  "text-accent-foreground text-base font-semibold",
                  "transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
