import type { BackdropTone } from "@/components/utils";
import { cn } from "@/components/utils";

interface AbstractBackdropProps {
  /**
   * "lines" is the CT motif (§6.5): concentric rings derived from the logo + dotted connectors.
   * "orbs" / "blobs" are kept as aliases so existing call sites render the same line system
   * (glows and gradients are out of the brand, §6.12).
   */
  variant?: "lines" | "orbs" | "blobs";
  tone?: BackdropTone;
  intensity?: "default" | "subtle";
  className?: string;
}

const RING_RADII = [120, 165, 210, 255, 300, 345, 390, 435, 480];

export function AbstractBackdrop({
  variant: _variant = "lines",
  tone = "dark",
  intensity = "default",
  className,
}: AbstractBackdropProps) {
  const stroke = tone === "dark" ? "var(--color-ct-electric-green)" : "var(--color-ct-slate-blue)";
  const ringOpacity = (tone === "dark" ? 0.18 : 0.35) * (intensity === "subtle" ? 0.6 : 1);

  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <svg
        className="absolute -right-[160px] -top-[200px] size-[1000px] max-w-none motion-safe:animate-[ct-drift_40s_var(--ease-in-out)_infinite]"
        viewBox="0 0 1000 1000"
        fill="none"
        style={{ opacity: ringOpacity }}
      >
        {RING_RADII.map((r) => (
          <circle key={r} cx="500" cy="500" r={r} stroke={stroke} strokeWidth="1.5" />
        ))}
      </svg>
      <svg
        className="absolute bottom-0 left-0 h-[70%] w-[60%] max-w-none"
        viewBox="0 0 600 400"
        preserveAspectRatio="xMinYMax meet"
        fill="none"
        style={{ opacity: ringOpacity * 1.4 }}
      >
        <path
          d="M0 340 H180 L260 260 H420 L500 180 H600"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="0 12"
        />
        <path
          d="M0 380 H240 L300 320 H600"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="0 12"
        />
        <circle cx="260" cy="260" r="4" fill={stroke} />
        <circle cx="500" cy="180" r="4" fill={stroke} />
      </svg>
    </div>
  );
}
