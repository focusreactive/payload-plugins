import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { ButtonSize, ButtonVariant } from "./types";
import type { ButtonProps } from "./types";

export { ButtonVariant, ButtonSize } from "./types";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 leading-none whitespace-nowrap transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: ButtonSize.Base,
      variant: ButtonVariant.Default,
    },
    variants: {
      size: {
        [ButtonSize.Small]: "min-h-9 px-4 text-[0.875rem]",
        [ButtonSize.Base]: "min-h-11 px-5 text-[0.9375rem]",
        [ButtonSize.Large]: "min-h-[52px] px-7 text-base",
      },
      variant: {
        [ButtonVariant.Default]: "p-0 text-foreground hover:text-primary",
        // Racing green fill on light, electric green on dark (tokens swap per zone).
        [ButtonVariant.Primary]:
          "rounded-md font-semibold bg-primary text-primary-foreground hover:bg-primary-hover",
        // Electric green / dark blue, inverting on hover (the live site's header CTA).
        [ButtonVariant.Accent]:
          "rounded-md font-semibold bg-accent text-accent-foreground hover:bg-ct-dark-blue hover:text-ct-electric-green",
        [ButtonVariant.Secondary]:
          "rounded-md font-semibold border border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground",
        [ButtonVariant.Badge]:
          "rounded-pill border border-border-strong px-3 py-1.5 text-eyebrow text-foreground",
        // Text link in the working colour with a trailing arrow.
        [ButtonVariant.Ghost]:
          "px-0 font-semibold text-primary hover:text-link-hover hover:underline underline-offset-[3px] after:content-['→'] after:transition-transform hover:after:translate-x-0.5",
        [ButtonVariant.GhostDark]:
          "rounded-md font-semibold bg-secondary text-secondary-foreground hover:bg-secondary-hover",
      },
    },
  }
);

export function Button({ className, variant, size, asChild, children, ...props }: ButtonProps) {
  const Component = (asChild ? Slot : "button") as any;

  return (
    <Component
      className={cn(
        "not-prose",
        buttonVariants({
          className,
          size,
          variant,
        })
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
