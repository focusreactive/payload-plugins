import type { ReactNode } from "react";
import { cn } from "../../../utils/style";

export interface RefreshableProps {
  refreshing?: boolean;
  className?: string;
  children: ReactNode;
}

export function Refreshable({ refreshing, className, children }: RefreshableProps) {
  return (
    <div
      aria-busy={refreshing || undefined}
      className={cn("transition-opacity", refreshing && "opacity-60", className)}
    >
      {children}
    </div>
  );
}
