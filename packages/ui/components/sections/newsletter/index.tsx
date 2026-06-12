"use client";

import { useState } from "react";

import { cn } from "../../../utils";
import { AbstractBackdrop } from "../../ui/AbstractBackdrop";
import { GridLines } from "../../ui/GridLines";
import { SectionHeader } from "../../ui/SectionHeader";

interface NewsletterSectionProps {
  badge?: string | null;
  heading: string;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
  theme?: string | null;
}

function isDarkTheme(theme: string | null | undefined): boolean {
  return theme === "dark" || theme === "dark-gray";
}

export function NewsletterSection({ badge, heading, inputPlaceholder, buttonLabel, disclaimer, theme }: NewsletterSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const dark = isDarkTheme(theme);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="relative overflow-hidden">
      {dark && (
        <>
          <AbstractBackdrop variant="orbs" tone="dark" />
          <GridLines tone="dark" />
        </>
      )}
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        <SectionHeader badge={badge} heading={heading} align="center" className="max-w-[760px]" />

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
                  "min-w-[280px] rounded-pill border border-transparent bg-surface px-5 py-3.5",
                  "text-foreground placeholder:text-muted-foreground",
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
