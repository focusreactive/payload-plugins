"use client";

import { cva } from "class-variance-authority";
import { AlertTriangle } from "lucide-react";
import type { HTMLAttributes } from "react";
import { cn } from "../utils/style";

const noticeVariants = cva(
  "text-[11.5px] rounded-rs px-[10px] py-[8px] flex items-start gap-[7px]",
  {
    variants: {
      variant: {
        warn: "text-seo-warn bg-seo-warn-100",
        bad: "text-seo-bad bg-seo-bad-100",
      },
    },
  }
);

interface NoticeProps extends HTMLAttributes<HTMLDivElement> {
  variant: "warn" | "bad";
}

export function Notice({ variant, className, children, ...props }: NoticeProps) {
  return (
    <div className={cn(noticeVariants({ variant }), className)} {...props}>
      <AlertTriangle aria-hidden="true" className="w-[15px] h-[15px] flex-none" />
      {children}
    </div>
  );
}
