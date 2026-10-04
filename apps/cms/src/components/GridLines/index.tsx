import type { BackdropTone } from "@/components/utils";
import { cn } from "@/components/utils";

interface GridLinesProps {
  tone?: BackdropTone;
  className?: string;
}

/** Faint static circuit grid (§6.5): 1px lines in the zone's border colour at 60%, masked to the centre. */
export function GridLines({ tone: _tone, className }: GridLinesProps) {
  // The zone tokens already switch the border colour between light and dark sections.
  const line = "color-mix(in srgb, var(--color-border) 60%, transparent)";

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 size-full [mask-image:radial-gradient(ellipse_at_70%_30%,#fff_20%,transparent_75%)]",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(to right, ${line} 1px, transparent 1px), linear-gradient(to bottom, ${line} 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }}
    />
  );
}
