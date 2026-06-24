import { ChevronDown } from "lucide-react";
import { cn } from "../../../../../utils/style";

export function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronDown
      size={13}
      strokeWidth={2.2}
      aria-hidden="true"
      className={cn(
        "flex-none text-neutral-500 transition-transform duration-150",
        !open && "-rotate-90"
      )}
    />
  );
}
