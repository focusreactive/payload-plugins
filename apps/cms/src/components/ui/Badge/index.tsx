import type { ReactNode } from "react";

import { cn } from "@/components/utils";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type BadgeTone = "soft" | "solid";

export interface BadgeProps {
  children: ReactNode;
  /**
   * "soft" is the pricing-card "Most popular" flag: mint fill, green text, rounded-lg, a clamped
   * height. "solid" is the billing-toggle "Save 20%" flag: solid green fill, white text, rounded-sm
   * (the concept's only 5px radius), and a fixed 18px height - the concept's one non-clamped control
   * height, reproduced literally rather than converted to a fluid one.
   */
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = "soft", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap",
        tone === "soft"
          ? "h-[clamp(24px,2vw,28px)] rounded-lg bg-primary-soft px-[clamp(8px,0.9vw,12px)]"
          : "h-[18px] rounded-sm bg-primary px-1.5",
        className
      )}
    >
      <Eyebrow
        size={tone === "soft" ? 11 : 9}
        tone={tone === "soft" ? "light" : "dark"}
        className={tone === "soft" ? "text-primary" : undefined}
      >
        {children}
      </Eyebrow>
    </span>
  );
}
