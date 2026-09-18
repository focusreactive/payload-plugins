import { Slot } from "@radix-ui/react-slot";

import { cn, cva } from "@/components/utils";
import type { ButtonProps } from "./types";

/**
 * Every button-shaped element across the concept's seven slices - nav link, pill CTA, topic chip's
 * "All topics" twin, pricing "Get Started", icon control - reduces to this one primitive behind four
 * independent props. The transition list is reproduced verbatim (34 elements carry it) even though
 * most tones only ever animate background/text/border; box-shadow and transform ride along so a
 * future tone can add either without a second transition line.
 */
export const buttonVariants = cva(
  "not-prose inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none font-sans transition-[background-color,color,border-color,box-shadow,transform] duration-[250ms] ease-[ease] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        primary: "bg-primary text-primary-foreground",
        white: "bg-white text-black",
        outlineLight: "border-[1.5px] border-white bg-transparent text-white",
        ghost: "bg-transparent text-foreground",
        surface: "bg-surface border border-border text-foreground",
      },
      /**
       * Sentence case is 15px/500 with no matching type utility - `text-small` is the same 15px at
       * the wrong weight (400, not 500), so it is an arbitrary value here. Caps is `text-eyebrow`
       * verbatim. Horizontal padding lives on this variant (not its own) because it is what the
       * concept actually keys padding off outside icon controls.
       */
      caps: {
        true: "text-eyebrow px-[clamp(12px,1.3vw,20px)]",
        false: "text-[15px] font-medium px-[clamp(14px,1.7vw,24px)]",
      },
      size: {
        md: "h-control rounded-lg",
        sm: "h-control-sm rounded-md",
      },
      // Declared after `caps` so its `p-0` wins the padding conflict once merged through `cn` -
      // twMerge keeps whichever padding utility occurs last in the string.
      iconOnly: {
        true: "aspect-square p-0",
        false: "",
      },
    },
    compoundVariants: [
      // The concept never puts a hover state on an `sm` control (the billing toggle) - gating every
      // tone's hover on size:"md" reproduces that instead of re-declaring "no hover" per tone.
      { tone: "primary", size: "md", className: "hover:bg-primary-hover" },
      { tone: "white", size: "md", className: "hover:bg-primary-soft" },
      {
        tone: "outlineLight",
        size: "md",
        className: "hover:bg-white hover:text-black",
      },
      { tone: "ghost", size: "md", className: "hover:bg-primary-soft" },
      {
        tone: "surface",
        size: "md",
        className: "hover:bg-primary-soft hover:border-primary",
      },
    ],
    defaultVariants: {
      tone: "primary",
      caps: false,
      size: "md",
      iconOnly: false,
    },
  }
);

export function Button({
  asChild,
  tone,
  caps,
  size,
  iconOnly,
  className,
  children,
  type,
  ...props
}: ButtonProps) {
  // Slot and the "button" intrinsic don't share one JSX call signature, so the cast is the same
  // escape hatch already used in apps/cms/src/components/button/index.tsx for this exact pattern.
  const Component = (asChild ? Slot : "button") as any;

  return (
    <Component
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ tone, caps, size, iconOnly, className }))}
      {...props}
    >
      {children}
    </Component>
  );
}
