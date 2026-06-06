"use client";

import type { ReactNode } from "react";
import { cn } from "../../../utils/style";
import type { Status } from "../../../engine/types";

const CLS: Record<Status, string> = { good: "g", warn: "w", bad: "b" };

interface StatusPillProps {
  status: Status;
  children: ReactNode;
}

export function StatusPill({ status, children }: StatusPillProps) {
  return <span className={cn("pill", CLS[status])}>{children}</span>;
}
