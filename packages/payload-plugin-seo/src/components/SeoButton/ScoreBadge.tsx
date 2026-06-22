"use client";

import type { Status } from "../../engine/types/analysis";
import { cva } from "class-variance-authority";
import { cn } from "../../utils/style";

const badgeVariants = cva(
  "absolute -top-1 -right-1 min-w-[14px] h-[14px] px-[3px] rounded-full text-white text-[9px] font-semibold leading-[14px] text-center pointer-events-none select-none",
  {
    variants: {
      status: {
        good: "bg-seo-good",
        warn: "bg-seo-warn",
        bad: "bg-seo-bad",
      },
    },
  }
);

interface ScoreBadgeProps {
  score: number;
  status: Status;
  className?: string;
}

export function ScoreBadge({ score, status, className }: ScoreBadgeProps) {
  return (
    <span aria-label={`SEO score ${score}`} className={cn(badgeVariants({ status }), className)}>
      {score}
    </span>
  );
}
