import type { BackdropTone } from "@/components/utils";
import { cn } from "@/components/utils";

interface AbstractBackdropProps {
  variant?: "orbs" | "blobs";
  tone?: BackdropTone;
  intensity?: "default" | "subtle";
  className?: string;
}

type ShapeMap = Record<
  NonNullable<AbstractBackdropProps["variant"]>,
  Record<BackdropTone, string[]>
>;

/*
 * The dark shapes used to be raw hexes from the teal-and-lime system this design replaced, so a
 * section set to Black or Charcoal still painted the previous brand behind Hero, CTA Band and
 * Newsletter - the three blocks that mount this. The light shapes already ran through tokens.
 */
const SHAPES: ShapeMap = {
  orbs: {
    dark: [
      "-left-[10%] -top-[14%] size-[540px] bg-green-600 opacity-50 blur-[72px] animate-[backdrop-float-a_19s_var(--ease-in-out)_infinite]",
      "right-[2%] top-[14%] size-[380px] bg-green-300 opacity-[0.38] blur-[72px] animate-[backdrop-float-b_23s_var(--ease-in-out)_infinite]",
      "-bottom-[8%] right-[28%] size-[260px] bg-accent opacity-[0.18] blur-[72px] animate-[backdrop-float-a_27s_var(--ease-in-out)_infinite_reverse]",
    ],
    light: [
      "-left-[10%] -top-[14%] size-[540px] bg-[var(--color-teal-600)] opacity-[0.22] blur-[72px] animate-[backdrop-float-a_19s_var(--ease-in-out)_infinite]",
      "right-[2%] top-[14%] size-[380px] bg-[var(--color-teal-400)] opacity-[0.18] blur-[72px] animate-[backdrop-float-b_23s_var(--ease-in-out)_infinite]",
      "-bottom-[8%] right-[28%] size-[260px] bg-accent opacity-[0.12] blur-[72px] animate-[backdrop-float-a_27s_var(--ease-in-out)_infinite_reverse]",
    ],
  },
  blobs: {
    dark: [
      "-left-[6%] -top-[34%] size-[460px] bg-green-300 opacity-40 blur-[90px] animate-[backdrop-float-a_21s_var(--ease-in-out)_infinite]",
      "-right-[4%] -top-[24%] size-[380px] bg-green-600 opacity-30 blur-[90px] animate-[backdrop-float-b_25s_var(--ease-in-out)_infinite]",
      "-bottom-[44%] left-[42%] size-[440px] bg-mint-200 opacity-[0.36] blur-[90px] animate-[backdrop-float-a_29s_var(--ease-in-out)_infinite_reverse]",
    ],
    light: [
      "-left-[6%] -top-[34%] size-[460px] bg-[var(--color-teal-300)] opacity-[0.28] blur-[90px] animate-[backdrop-float-a_21s_var(--ease-in-out)_infinite]",
      "-right-[4%] -top-[24%] size-[380px] bg-accent opacity-[0.18] blur-[90px] animate-[backdrop-float-b_25s_var(--ease-in-out)_infinite]",
      "-bottom-[44%] left-[42%] size-[440px] bg-[var(--color-teal-soft-light)] opacity-[0.6] blur-[90px] animate-[backdrop-float-a_29s_var(--ease-in-out)_infinite_reverse]",
    ],
  },
};

const SUBTLE_ORBS_DARK = [
  "-left-[10%] -top-[14%] size-[540px] bg-green-600 opacity-25 blur-[72px] animate-[backdrop-float-a_19s_var(--ease-in-out)_infinite]",
  "right-[2%] top-[14%] size-[380px] bg-green-300 opacity-[0.19] blur-[72px] animate-[backdrop-float-b_23s_var(--ease-in-out)_infinite]",
  "-bottom-[8%] right-[28%] size-[260px] bg-accent opacity-[0.15] blur-[72px] animate-[backdrop-float-a_27s_var(--ease-in-out)_infinite_reverse]",
];

const SUBTLE_BLOBS_DARK: string[] = [];

function subtleDarkShapes(variant: NonNullable<AbstractBackdropProps["variant"]>) {
  return variant === "orbs" ? SUBTLE_ORBS_DARK : SUBTLE_BLOBS_DARK;
}

export function AbstractBackdrop({
  variant = "orbs",
  tone = "dark",
  intensity = "default",
  className,
}: AbstractBackdropProps) {
  const subtle = intensity === "subtle" && tone === "dark";
  const shapes = subtle ? subtleDarkShapes(variant) : SHAPES[variant][tone];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        tone === "dark" &&
          variant === "orbs" &&
          "bg-deep-950 bg-[radial-gradient(120%_90%_at_78%_8%,var(--color-teal-soft-dark)_0%,transparent_52%),radial-gradient(110%_100%_at_8%_100%,var(--color-teal-soft-pine)_0%,transparent_58%)]",
        tone === "light" &&
          variant === "orbs" &&
          "bg-[radial-gradient(120%_90%_at_78%_8%,var(--color-mint-50)_0%,transparent_52%)]",
        subtle &&
          variant === "blobs" &&
          "bg-deep-950 bg-[radial-gradient(75%_135%_at_50%_128%,color-mix(in_srgb,var(--color-green-600)_15%,transparent),transparent_60%),radial-gradient(120%_90%_at_80%_6%,var(--color-teal-soft-dark)_0%,transparent_52%),radial-gradient(115%_100%_at_6%_100%,var(--color-teal-soft-pine)_0%,transparent_58%)]",
        className
      )}
    >
      {shapes.map((shape) => (
        <div
          key={shape}
          className={cn(
            "absolute rounded-pill will-change-transform motion-reduce:animate-none",
            shape
          )}
        />
      ))}
    </div>
  );
}
