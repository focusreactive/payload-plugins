"use client";

import { useState } from "react";

import { cn, resolveBackdropTone } from "@/components/utils";
import { AbstractBackdrop } from "@/components/AbstractBackdrop";
import { GridLines } from "@/components/GridLines";
import type { SectionHeaderProps } from "@/components/SectionHeader";
import { SectionHeader } from "@/components/SectionHeader";

interface NewsletterSectionProps {
  /** Block id: the no-JS submit redirects back to `#newsletter-<id>-ok`. */
  id?: string | null;
  header?: SectionHeaderProps | null;
  inputPlaceholder: string;
  buttonLabel: string;
  disclaimer?: string | null;
  theme?: string | null;
}

export function NewsletterSection({
  id,
  header,
  inputPlaceholder,
  buttonLabel,
  disclaimer,
  theme,
}: NewsletterSectionProps) {
  const [submitted, setSubmitted] = useState(false);
  const [failed, setFailed] = useState(false);
  const backdropTone = resolveBackdropTone(theme);
  const formId = `newsletter-${id ?? "band"}`;

  // Posts to the shared form endpoint (stored as a "newsletter" submission); without JS the
  // server redirects back to the #…-ok anchor, which CSS :target turns into the success line.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    data.set("page", window.location.href);
    data.set("referrer", document.referrer);
    try {
      const response = await fetch("/api/forms/submit", {
        body: data,
        headers: { Accept: "application/json" },
        method: "POST",
      });
      setSubmitted(response.ok);
      setFailed(!response.ok);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div>
      <AbstractBackdrop variant="orbs" tone={backdropTone} intensity="subtle" />
      <GridLines tone={backdropTone} />
      <div className="relative z-10 flex flex-col items-center gap-[26px] py-[clamp(56px,8vw,104px)] text-center">
        {header && <SectionHeader {...header} align="center" className="max-w-[760px]" />}

        <div aria-live="polite" className="ct-form flex flex-col items-center gap-4">
          <p
            id={`form-${formId}-ok`}
            className="ct-form-success text-lead font-medium"
            tabIndex={-1}
          >
            You&rsquo;re in. Talk soon.
          </p>
          {submitted ? (
            <p className="text-lead font-medium">You&rsquo;re in. Talk soon.</p>
          ) : (
            <form
              method="post"
              action="/api/forms/submit"
              onSubmit={handleSubmit}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <input type="hidden" name="formName" value="newsletter" />
              <input type="hidden" name="formId" value={formId} />
              <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
                <input name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <label htmlFor={`${formId}-email`} className="sr-only">
                Email address
              </label>
              <input
                id={`${formId}-email`}
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
              {failed && (
                <p role="alert" className="w-full text-small">
                  Something went wrong. Please try again.
                </p>
              )}
            </form>
          )}
        </div>

        {disclaimer && <p className="text-small text-muted-foreground">{disclaimer}</p>}
      </div>
    </div>
  );
}
