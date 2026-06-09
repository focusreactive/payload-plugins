"use client";

import type { ReactNode } from "react";
import type { Status } from "../engine/types/analysis";
import { statusPillVariants } from "../components/SeoDrawer/variants";

export const STATUS_PILL_LABEL: Record<Status, string> = {
  good: "Good",
  warn: "Needs work",
  bad: "Problem",
};

interface StatusPillProps {
  status: Status;
  children: ReactNode;
}

export function StatusPill({ status, children }: StatusPillProps) {
  return <span className={statusPillVariants({ status })}>{children}</span>;
}
