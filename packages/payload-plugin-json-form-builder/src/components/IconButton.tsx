"use client";

import { clsx as cn } from "clsx";
import type { ReactNode } from "react";
import { Tip } from "./Tip.js";

export const IconButton = ({
  children,
  className,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) => (
  <Tip label={label}>
    <button
      aria-label={label}
      className={cn("icon-button", className)}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  </Tip>
);
