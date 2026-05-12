import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function CaveatBanner({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-[var(--theme-warning-50)] border border-[var(--theme-warning-100)] border-l-[3px] border-l-[var(--theme-warning-500)] rounded-[var(--style-radius-m)] px-3.5 py-2.5 text-[12.5px] text-[var(--theme-warning-700)] mb-4">
      <AlertTriangle size={15} className="text-[var(--theme-warning-500)] shrink-0 mt-0.5" />

      <div>{children}</div>
    </div>
  );
}
