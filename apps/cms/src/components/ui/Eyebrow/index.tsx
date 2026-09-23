import type { ReactNode } from "react";

import { cn, cva } from "@/components/utils";
import type { BackdropTone } from "@/components/utils";

/**
 * "muted" is the one Eyebrow colour that is not a section's plain foreground: the card date sits at
 * a fixed rgba(0,0,0,0.5), which is not one of the defined ink-alpha steps (the nearest are ink-42
 * and ink-62), so it is reproduced as an arbitrary value rather than rounded to either.
 */
export type EyebrowTone = BackdropTone | "muted";
export type EyebrowSize = 9 | 11 | 12 | 14;

export interface EyebrowProps {
  children: ReactNode;
  /**
   * The footer column headings and plan feature-box headings sit above a block below them and need
   * their own margin-bottom - an inline `span` ignores vertical margin, so they render as `div`.
   */
  as?: "span" | "div";
  size?: EyebrowSize;
  tone?: EyebrowTone;
  /**
   * Off only for the card date (size 11): its content is already upper-cased, so the concept both
   * drops the transform and eases the tracking from 0.1em to 0.08em with it.
   */
  uppercase?: boolean;
  className?: string;
}

const eyebrowVariants = cva("font-medium", {
  variants: {
    size: {
      9: "text-[9px] tracking-[0.08em]",
      11: "text-[11px] tracking-[0.1em]",
      // Bakes in 12px/uppercase/0.1em as one utility - it only covers the concept's one 12px case
      // (uppercase), see the uppercase===false fallback below.
      12: "text-eyebrow",
      14: "text-[14px] tracking-[0.14em]",
    },
    tone: {
      light: "text-foreground",
      dark: "text-white",
      muted: "text-black/50",
    },
  },
  defaultVariants: {
    size: 12,
    tone: "light",
  },
});

export function Eyebrow({
  children,
  as: Component = "span",
  size = 12,
  tone = "light",
  uppercase = true,
  className,
}: EyebrowProps) {
  return (
    <Component
      className={cn(
        eyebrowVariants({ size, tone }),
        // size 12's uppercase is already inside text-eyebrow itself, so it is only toggled here for
        // every other size, and eased back to 0.08em only at size 11 - the concept's sole
        // non-uppercase instance. (A hypothetical uppercase=false at size 12 has no effect: nothing
        // in the concept needs it, so text-eyebrow's built-in transform is left as the one exception.)
        size !== 12 && (uppercase ? "uppercase" : "normal-case"),
        size === 11 && !uppercase && "tracking-[0.08em]",
        className
      )}
    >
      {children}
    </Component>
  );
}
