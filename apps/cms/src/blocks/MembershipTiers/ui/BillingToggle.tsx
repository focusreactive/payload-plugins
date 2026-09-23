"use client";

import { useEffect, useRef, useState } from "react";

import { classNames } from "./classNames";
import type { BillingPeriod } from "./types";

interface BillingToggleProps {
  annualLabel: string;
  monthlyLabel: string;
  onChange: (period: BillingPeriod) => void;
  savingsBadge?: string;
  value: BillingPeriod;
}

interface PadPlacement {
  left: number;
  width: number;
}

/**
 * The white pad sits behind the labels, so both buttons carry `relative` to paint above it.
 * Colour is applied per button, because only the active one sits on white.
 */
const TOGGLE_BUTTON_CLASS = classNames(
  "relative flex h-[clamp(28px,2.2vw,32px)] cursor-pointer items-center gap-2",
  "rounded-md border-none bg-transparent px-[clamp(12px,1.3vw,18px)]",
  "text-small font-medium whitespace-nowrap",
  "transition-colors duration-[250ms] ease-[ease] motion-reduce:transition-none",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
);

export function BillingToggle({
  annualLabel,
  monthlyLabel,
  onChange,
  savingsBadge,
  value,
}: BillingToggleProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const monthlyButtonRef = useRef<HTMLButtonElement>(null);
  const annualButtonRef = useRef<HTMLButtonElement>(null);
  const [padPlacement, setPadPlacement] = useState<PadPlacement | null>(null);
  const [hasSettled, setHasSettled] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const activeButton = value === "annual" ? annualButtonRef.current : monthlyButtonRef.current;
      if (!activeButton) return;
      setPadPlacement({ left: activeButton.offsetLeft, width: activeButton.offsetWidth });
    };

    measure();
    // Both buttons are sized by clamp() against the viewport, so their widths change on a resize
    // with no state here changing. Without re-measuring, the pad drifts off the active label.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(track);

    return () => resizeObserver.disconnect();
  }, [value]);

  useEffect(() => {
    // The pad is zero-wide until the first measurement lands, so that first placement has to happen
    // with the transition off, or it visibly flies in from the left edge of the track on load.
    if (padPlacement && !hasSettled) {
      setHasSettled(true);
    }
  }, [padPlacement, hasSettled]);

  return (
    <div className="flex flex-none items-center gap-[clamp(8px,1vw,12px)]">
      <div
        aria-label="Billing period"
        className={classNames(
          "relative flex max-w-full items-center gap-1 rounded-lg",
          "bg-ink-24 p-1 backdrop-blur-[18px]"
        )}
        ref={trackRef}
        role="group"
      >
        <span
          aria-hidden
          className={classNames(
            "pointer-events-none absolute top-1 bottom-1 rounded-md bg-white",
            hasSettled &&
              "transition-[left,width,opacity] duration-[250ms] ease-[ease] motion-reduce:transition-none"
          )}
          style={{
            left: padPlacement?.left ?? 4,
            opacity: padPlacement ? 1 : 0,
            width: padPlacement?.width ?? 0,
          }}
        />

        <button
          aria-pressed={value === "monthly"}
          className={classNames(
            TOGGLE_BUTTON_CLASS,
            value === "monthly" ? "text-black" : "text-white"
          )}
          onClick={() => onChange("monthly")}
          ref={monthlyButtonRef}
          type="button"
        >
          {monthlyLabel}
        </button>

        <button
          aria-pressed={value === "annual"}
          className={classNames(
            TOGGLE_BUTTON_CLASS,
            value === "annual" ? "text-black" : "text-white"
          )}
          onClick={() => onChange("annual")}
          ref={annualButtonRef}
          type="button"
        >
          {annualLabel}
          {savingsBadge && (
            <span
              className={classNames(
                "flex h-[18px] items-center rounded-sm bg-primary px-1.5",
                // Below `text-eyebrow`: at 12px with 0.14em tracking the tag bursts the 18px pill.
                "text-[9px] font-medium tracking-[0.08em] text-primary-foreground uppercase"
              )}
            >
              {savingsBadge}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
