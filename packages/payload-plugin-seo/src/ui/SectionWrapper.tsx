"use client";

import type { ReactNode } from "react";
import { cn } from "../utils/style";

interface SectionWrapperProps {
  className?: string;
  children: ReactNode;
}

export function SectionWrapper({ className, children }: SectionWrapperProps) {
  return (
    <div className={cn("bg-neutral-0 border border-neutral-200 rounded-rm", className)}>
      {children}
    </div>
  );
}
