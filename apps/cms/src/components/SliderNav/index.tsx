import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/components/utils";

interface SliderNavProps {
  onPrev: () => void;
  onNext: () => void;
  prevLabel?: string;
  nextLabel?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  className?: string;
}

const buttonClassName =
  "inline-flex items-center px-3 py-2 text-foreground transition-opacity duration-150 ease-out hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30";

/** Pill with previous / next chevrons, shared by every slider in the design. */
export function SliderNav({
  onPrev,
  onNext,
  prevLabel = "Previous",
  nextLabel = "Next",
  prevDisabled,
  nextDisabled,
  className,
}: SliderNavProps) {
  return (
    <div
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-pill border border-border bg-surface",
        className
      )}
    >
      <button
        type="button"
        aria-label={prevLabel}
        onClick={onPrev}
        disabled={prevDisabled}
        className={cn(buttonClassName, "rounded-l-pill")}
      >
        <ChevronLeft aria-hidden size={18} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label={nextLabel}
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(buttonClassName, "rounded-r-pill")}
      >
        <ChevronRight aria-hidden size={18} strokeWidth={1.5} />
      </button>
    </div>
  );
}
