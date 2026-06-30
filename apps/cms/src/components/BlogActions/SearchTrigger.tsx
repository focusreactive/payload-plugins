import { SearchIcon } from "lucide-react";
import { cn } from "../utils";

interface SearchTriggerProps {
  open: () => void;
  isHidden: boolean;
}

export function SearchTrigger({ isHidden, open }: SearchTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "w-10 aspect-square self-start flex-none flex items-center justify-center rounded-pill bg-transparent border border-border-strong",
        "transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none",
        isHidden && "scale-75 opacity-0 pointer-events-none"
      )}
      onClick={open}
    >
      <SearchIcon aria-hidden className="size-[17px]" />
    </button>
  );
}
