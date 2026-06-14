"use client";

import type { ReactNode } from "react";
import type { Status } from "../engine/types/analysis";
import { cva } from "class-variance-authority";

const pillVariants = cva("inline-flex items-center gap-[4px] px-[14px] py-[1px] rounded-[20px] text-[11px] font-semibold", {
  variants: {
    variant: {
      good: "bg-seo-good-100 text-seo-good",
      warn: "bg-seo-warn-100 text-seo-warn",
      bad: "bg-seo-bad-100 text-seo-bad",
      neutral: "bg-neutral-100 text-neutral-500",
    },
  },
});

interface PillProps {
  variant: Status | "neutral";
  children: ReactNode;
}

export function Pill({ variant, children }: PillProps) {
  return <span className={pillVariants({ variant })}>{children}</span>;
}
