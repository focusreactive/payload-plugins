"use client";

import { useState } from "react";

import { Media } from "@/components/media";

import { classNames } from "./classNames";
import { BillingToggle } from "./BillingToggle";
import { TierCard } from "./TierCard";
import type { BillingPeriod, IMembershipTiersProps } from "./types";

function EyebrowStar() {
  return (
    <svg
      aria-hidden="true"
      className="flex-none"
      fill="currentColor"
      height="14"
      viewBox="0 0 14 14"
      width="14"
    >
      <path d="M7 0l1.3 4.4L13 5.7 8.4 7 7 14 5.6 7 1 5.7 5.7 4.4z" />
    </svg>
  );
}

export function MembershipTiers({
  annualLabel,
  annualPeriodSuffix,
  backgroundImage,
  defaultPeriod,
  eyebrow,
  heading,
  monthlyLabel,
  monthlyPeriodSuffix,
  savingsBadge,
  showBillingToggle,
  tiers,
}: IMembershipTiersProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(defaultPeriod);

  const hasToggle = showBillingToggle && Boolean(monthlyLabel) && Boolean(annualLabel);
  // With the switch hidden there is only one price to show, and it is the monthly one.
  const activePeriod: BillingPeriod = hasToggle ? billingPeriod : "monthly";
  const periodSuffix = activePeriod === "annual" ? annualPeriodSuffix : monthlyPeriodSuffix;

  if (tiers.length === 0) return null;

  return (
    <div className="relative mx-auto w-full max-w-[1520px] overflow-hidden rounded-2xl bg-surface-muted">
      <Media
        {...backgroundImage.data}
        className="absolute inset-0 size-full"
        imageProps={{
          ...backgroundImage.imageProps,
          className: "size-full object-cover",
          fill: true,
          sizes: "100vw",
        }}
        visualEditing={backgroundImage.visualEditing}
      />

      {/* Only the first two stops have a token; the design's 0.36 has no counterpart in the ink ramp. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(160deg,var(--color-ink-42)_0%,var(--color-ink-24)_42%,rgba(0,0,0,0.36)_100%)]"
      />

      <div
        className={classNames(
          "relative flex flex-col gap-[clamp(28px,3.4vw,52px)]",
          "px-[clamp(24px,3.4vw,64px)] py-[clamp(28px,3.4vw,64px)]"
        )}
      >
        <div
          className={classNames(
            "flex flex-wrap items-start justify-between gap-[clamp(20px,3vw,48px)]",
            "lg:items-end"
          )}
        >
          <div className="min-w-0">
            {eyebrow && (
              <div className="mb-[clamp(10px,1.2vw,18px)] flex items-center gap-2.5 text-white">
                <EyebrowStar />
                <span className="text-small">{eyebrow}</span>
              </div>
            )}
            <h2 className="text-balance text-display-1 text-white">{heading}</h2>
          </div>

          {hasToggle && (
            <BillingToggle
              annualLabel={annualLabel}
              monthlyLabel={monthlyLabel}
              onChange={setBillingPeriod}
              savingsBadge={savingsBadge}
              value={billingPeriod}
            />
          )}
        </div>

        {/*
          Top-aligned on purpose: the plans carry different numbers of included lines and the
          concept lets the cards end at different heights. Do not stretch them to match.
        */}
        <div className="grid grid-cols-1 items-start gap-[clamp(14px,1.6vw,24px)] lg:grid-cols-3">
          {tiers.map((tier, index) => (
            <TierCard
              billingPeriod={activePeriod}
              key={index}
              periodSuffix={periodSuffix}
              tier={tier}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
