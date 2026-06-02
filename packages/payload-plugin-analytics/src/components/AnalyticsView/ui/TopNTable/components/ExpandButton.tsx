import { ChevronRight } from "lucide-react";

export interface ExpandButtonProps {
  expanded: boolean;
  total: number;
  onToggle: () => void;
}

export function ExpandButton({ expanded, total, onToggle }: ExpandButtonProps) {
  return (
    <button type="button" onClick={onToggle} className="mt-2 inline-flex items-center gap-1 text-[11px] text-(--theme-elevation-500) hover:text-(--theme-elevation-1000)">
      {expanded ? "Show less" : `Show all (${total})`}
      <ChevronRight size={11} />
    </button>
  );
}
