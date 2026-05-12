import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../../utils/style";

export interface DataCardProps {
  title: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function DataCard({ title, icon: Icon, action, className, children }: DataCardProps) {
  return (
    <div
      className={cn(
        "bg-[var(--theme-elevation-0)] border border-[var(--theme-border-color)] rounded-[var(--style-radius-m)] p-4 min-w-0 relative",
        className,
      )}>
      <div className="flex items-center justify-between gap-2.5 mb-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--theme-elevation-700)] tracking-wide">
          {Icon && <Icon size={14} className="text-[var(--theme-elevation-500)]" />}

          <span>{title}</span>
        </div>

        {action && (
          <div className="text-xs text-[var(--theme-elevation-500)] cursor-pointer hover:text-[var(--theme-elevation-1000)]">
            {action}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
