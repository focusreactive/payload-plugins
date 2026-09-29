import Link from "next/link";

import { classNames } from "./classNames";
import type { BillingPeriod, IMembershipTier } from "./types";

interface TierCardProps {
  billingPeriod: BillingPeriod;
  periodSuffix?: string;
  tier: IMembershipTier;
}

function IncludedArrow({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={classNames("mt-[5px] flex-none", className)}
      fill="none"
      height="9"
      viewBox="0 0 16 10"
      width="14"
    >
      <path
        d="M1 5h13M10 1l4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function TierCard({ billingPeriod, periodSuffix, tier }: TierCardProps) {
  const isFeatured = tier.emphasis === "featured";
  // An empty annual price is the editor saying this plan costs the same either way, so the monthly
  // figure stands in rather than the card going blank on the annual side of the switch.
  const price =
    billingPeriod === "annual" && tier.priceAnnual ? tier.priceAnnual : tier.priceMonthly;

  return (
    <article
      className={classNames(
        "flex flex-col rounded-xl p-[clamp(16px,1.7vw,28px)]",
        isFeatured ? "bg-white shadow-soft" : "bg-white-11 backdrop-blur-[26px]"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h3 className={classNames("text-h-section", isFeatured ? "text-black" : "text-white")}>
          {tier.name}
        </h3>
        {isFeatured && tier.badge && (
          <span
            className={classNames(
              "flex h-[clamp(24px,2vw,28px)] items-center rounded-lg",
              "bg-primary-soft px-[clamp(8px,0.9vw,12px)] text-eyebrow text-primary whitespace-nowrap"
            )}
          >
            {tier.badge}
          </span>
        )}
      </div>

      {tier.tagline && (
        <p className={classNames("mt-1.5 text-small", isFeatured ? "text-ink-62" : "text-white")}>
          {tier.tagline}
        </p>
      )}

      <div className="mt-[clamp(18px,2vw,30px)] mb-[clamp(16px,1.8vw,26px)] flex flex-wrap items-baseline gap-2">
        {/* Tabular figures, so swapping the monthly figure for the annual one cannot jog the row. */}
        <span
          className={classNames(
            "text-display-2 tabular-nums",
            isFeatured ? "text-primary" : "text-white"
          )}
        >
          {price}
        </span>
        {periodSuffix && (
          <span className={classNames("text-small", isFeatured ? "text-ink-62" : "text-white")}>
            {periodSuffix}
          </span>
        )}
      </div>

      {tier.ctaLabel && (
        <Link
          className={classNames(
            "flex h-[clamp(40px,3.4vw,46px)] items-center justify-center rounded-lg",
            "px-[clamp(14px,1.7vw,24px)] text-eyebrow whitespace-nowrap",
            "transition-[background-color,color,border-color,box-shadow,transform]",
            "duration-[250ms] ease-[ease] motion-reduce:transition-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            isFeatured
              ? "bg-primary text-primary-foreground hover:bg-primary-hover"
              : "border-[1.5px] border-white text-white hover:bg-white hover:text-black"
          )}
          href={tier.ctaHref || "#"}
        >
          {tier.ctaLabel}
        </Link>
      )}

      {tier.features.length > 0 && (
        <div
          className={classNames(
            "mt-[clamp(18px,2vw,28px)] rounded-lg p-[clamp(14px,1.5vw,22px)]",
            isFeatured ? "bg-primary-soft" : "bg-white-11"
          )}
        >
          {tier.featuresHeading && (
            <h4
              className={classNames(
                "mb-[clamp(12px,1.3vw,18px)] text-eyebrow",
                isFeatured ? "text-black" : "text-white"
              )}
            >
              {tier.featuresHeading}
            </h4>
          )}
          <ul className="flex flex-col gap-[clamp(10px,1.1vw,14px)]">
            {tier.features.map((feature, index) => (
              <li className="flex items-start gap-2.5" key={index}>
                <IncludedArrow className={isFeatured ? "text-primary" : "text-white"} />
                <span
                  className={classNames("text-small", isFeatured ? "text-black" : "text-white")}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
