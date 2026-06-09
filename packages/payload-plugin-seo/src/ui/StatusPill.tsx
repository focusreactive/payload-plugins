"use client";

import type { ReactNode } from "react";
import type { Status } from "../engine/types/analysis";
import { statusPillVariants } from "../components/SeoDrawer/variants";

interface StatusPillProps {
  status: Status;
  children: ReactNode;
}

export function StatusPill({ status, children }: StatusPillProps) {
  return <span className={statusPillVariants({ status })}>{children}</span>;
}
