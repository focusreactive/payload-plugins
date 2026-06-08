"use client";

import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
}

export function KpiCard({ label, value, suffix }: KpiCardProps) {
  return (
    <div className="bg-neutral-0 border border-neutral-200 rounded-rm px-[13px] py-[12px]">
      <div className="flex items-center gap-[6px]">
        <span className="text-[9.5px] uppercase tracking-[0.05em] text-neutral-500 font-semibold">{label}</span>
      </div>

      <div className="text-[23px] font-bold mt-[5px] leading-none">
        {value}
        {suffix && <small className="text-[11px] font-medium text-neutral-500"> {suffix}</small>}
      </div>
    </div>
  );
}
