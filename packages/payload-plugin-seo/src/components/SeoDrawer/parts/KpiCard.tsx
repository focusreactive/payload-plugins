"use client";

import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
}

export function KpiCard({ label, value, suffix }: KpiCardProps) {
  return (
    <div className="kpiA">
      <div className="ktop">
        <span className="lbl">{label}</span>
      </div>

      <div className="num">
        {value}
        {suffix && <small> {suffix}</small>}
      </div>
    </div>
  );
}
