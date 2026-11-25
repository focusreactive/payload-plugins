import { cn } from "@/components/utils";

interface GlowBackdropProps {
  /**
   * "seam"   — centred on the top edge of the parent, so half of it bleeds into the
   *            section above and the other half sits behind the parent's glass panel.
   * "center" — centred inside the parent.
   */
  placement?: "seam" | "center";
  className?: string;
}

/**
 * The striped violet → magenta glow from the design. It is painted on a negative
 * z-index layer so glass surfaces (cards, panels, the footer) blur and tint it.
 * The parent must be `relative` and must NOT create a stacking context.
 */
export function GlowBackdrop({ placement = "seam", className }: GlowBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "glow-stripes pointer-events-none absolute inset-x-0 -z-1 h-(--glow-height)",
        placement === "seam" ? "top-0 -translate-y-1/2" : "top-1/2 -translate-y-1/2",
        className
      )}
    />
  );
}
