import type { LucideIcon } from "lucide-react";

export interface EmptyTileProps {
  message?: string;
  icon?: LucideIcon;
}

export function EmptyTile({ message = "No data in this range.", icon: Icon }: EmptyTileProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-[var(--theme-elevation-500)] text-sm gap-2">
      {Icon && <Icon size={20} className="text-[var(--theme-elevation-300)]" />}

      <span>{message}</span>
    </div>
  );
}
