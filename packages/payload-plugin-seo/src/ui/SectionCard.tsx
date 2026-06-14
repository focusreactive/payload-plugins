"use client";

import type { ReactNode } from "react";
import { SectionWrapper } from "./SectionWrapper";

interface SectionCardProps {
  title: string;
  widget?: ReactNode;
  children: ReactNode;
}

export function SectionCard({ title, widget, children }: SectionCardProps) {
  return (
    <SectionWrapper className="overflow-hidden">
      <div className="flex items-center justify-between px-[15px] py-[12px] border-b border-neutral-200">
        <span className="font-semibold text-[13px]">{title}</span>
        {widget}
      </div>
      {children}
    </SectionWrapper>
  );
}
