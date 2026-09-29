"use client";

import NextImage from "next/image";
import { useState } from "react";

/*
 * These lists are plain strings rather than cn(...) on purpose: cn is tailwind-merge, which reads
 * `text-small` and `text-display-2` as colour classes and silently drops them when a text colour
 * sits in the same call. Passing the list as one literal keeps both the size and the colour.
 */
const panelGridClassName = [
  "relative grid grid-cols-1 items-center gap-6",
  "px-[clamp(24px,3.4vw,64px)] py-[clamp(28px,3.2vw,56px)]",
  "md:grid-cols-[auto_minmax(0,1fr)] md:gap-[clamp(20px,3vw,40px)]",
  "lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-12",
].join(" ");

// At lg the well contributes no height of its own, which is what lets the cover break out.
const coverWellClassName = [
  "flex min-w-0 justify-center md:justify-start",
  "lg:relative lg:block lg:w-[clamp(104px,19.8vw,210px)] lg:shrink-0 lg:self-stretch",
].join(" ");

const coverImageClassName = [
  "h-[clamp(168px,32vw,340px)] w-auto max-w-none",
  "[filter:drop-shadow(0_18px_34px_var(--color-ink-42))]",
  "lg:absolute lg:top-1/2 lg:left-0 lg:-translate-y-1/2",
].join(" ");

const emailInputClassName = [
  "h-[clamp(40px,3.4vw,46px)] w-full max-w-[420px] rounded-lg",
  "border border-white-28 bg-white-11 px-[clamp(14px,1.7vw,20px)]",
  "text-small text-white placeholder:text-white-62",
  "outline-none focus-visible:ring-2 focus-visible:ring-accent",
].join(" ");

const submitButtonClassName = [
  "box-border inline-flex h-[clamp(40px,3.4vw,46px)] items-center justify-center",
  "rounded-lg bg-white px-[clamp(14px,1.7vw,24px)] whitespace-nowrap",
  "text-small font-medium text-black",
  "transition-colors duration-[250ms] ease-[ease] hover:bg-primary-soft",
  "disabled:pointer-events-none disabled:opacity-60",
  "w-full sm:w-auto md:col-start-2 md:justify-self-start lg:col-start-auto lg:justify-self-end",
].join(" ");

interface BookOfferProps {
  eyebrow?: string | null;
  heading: string;
  description?: string | null;
  emailPlaceholder: string;
  submitLabel: string;
  successMessage: string;
  coverSrc?: string;
  coverAlt?: string;
  coverWidth?: number;
  coverHeight?: number;
}

export function BookOffer({
  eyebrow,
  heading,
  description,
  emailPlaceholder,
  submitLabel,
  successMessage,
  coverSrc,
  coverAlt,
  coverWidth,
  coverHeight,
}: BookOfferProps) {
  const [hasSubmitted, setHasSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No mailing list is wired up in this build, so the panel confirms locally and the address
    // is deliberately never sent anywhere.
    setHasSubmitted(true);
  }

  return (
    // Never overflow-hidden: the cover breaks out of the panel top and bottom, which is why the
    // photo and the scrim each carry the panel radius themselves.
    <div className="relative mx-auto w-full max-w-[1520px]">
      <NextImage
        src="/design/night-flowers-background-01.webp"
        alt=""
        aria-hidden
        fill
        sizes="(max-width: 1180px) 100vw, 1180px"
        className="rounded-2xl object-cover object-center"
      />

      {/* Only the 0.42 stop has a token; the design's 0.52 and 0.34 have no counterpart in the ink ramp. */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-2xl bg-[linear-gradient(120deg,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.34)_55%,var(--color-ink-42)_100%)]"
      />

      <form onSubmit={handleSubmit} className={panelGridClassName}>
        {coverSrc ? (
          <div className={coverWellClassName}>
            <NextImage
              src={coverSrc}
              alt={coverAlt ?? ""}
              width={coverWidth ?? 741}
              height={coverHeight ?? 1200}
              sizes="(min-width: 1024px) 210px, 45vw"
              className={coverImageClassName}
            />
          </div>
        ) : null}

        <div className="w-full min-w-0">
          {eyebrow && (
            <div className="mb-[clamp(8px,1vw,14px)] flex items-center gap-2.5 text-white">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="currentColor"
                aria-hidden="true"
                className="shrink-0"
              >
                <path d="M7 0l1.3 4.4L13 5.7 8.4 7 7 14 5.6 7 1 5.7 5.7 4.4z" />
              </svg>
              <span className="text-small text-white">{eyebrow}</span>
            </div>
          )}

          <h2 className="mb-[clamp(8px,1vw,14px)] text-balance text-display-2 text-white">
            {heading}
          </h2>

          {description && <p className="text-pretty text-lead text-white">{description}</p>}

          <div aria-live="polite" className="mt-[clamp(14px,1.6vw,22px)]">
            {hasSubmitted ? (
              <p className="text-small text-white">{successMessage}</p>
            ) : (
              <>
                {/* The prompt doubles as the field's name so the label follows the reader's language. */}
                <label htmlFor="book-offer-email" className="sr-only">
                  {emailPlaceholder}
                </label>
                <input
                  id="book-offer-email"
                  type="email"
                  name="email"
                  required
                  placeholder={emailPlaceholder}
                  className={emailInputClassName}
                />
              </>
            )}
          </div>
        </div>

        <button type="submit" disabled={hasSubmitted} className={submitButtonClassName}>
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
