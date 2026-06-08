"use client";

import type { ReactNode } from "react";
import type { Status } from "../../../engine/types";
import { statusPillVariants } from "../variants";

interface StatusPillProps {
  status: Status;
  children: ReactNode;
}

export function StatusPill({ status, children }: StatusPillProps) {
  return <span className={statusPillVariants({ status })}>{children}</span>;
}
