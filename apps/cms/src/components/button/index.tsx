import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { ButtonSize, ButtonVariant } from "./types";
import type { ButtonProps } from "./types";

export { ButtonVariant, ButtonSize } from "./types";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-1 font-medium capitalize whitespace-nowrap transition-[background-color,border-color,box-shadow,opacity,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: ButtonSize.Base,
      variant: ButtonVariant.Default,
    },
    variants: {
      size: {
        [ButtonSize.Small]: "px-6 py-3 text-small",
        [ButtonSize.Base]: "px-8 py-4 text-body leading-5",
        [ButtonSize.Large]:
          "px-8 py-4 text-body leading-5 md:px-12 md:py-6 md:text-[1.25rem] md:leading-6",
      },
      variant: {
        [ButtonVariant.Default]: "rounded-pill !px-0 text-foreground hover:text-primary-hover",
        [ButtonVariant.Primary]:
          "rounded-pill border border-brand bg-white-2 text-foreground shadow-glow-button backdrop-blur-glass-sm hover:border-brand-hover hover:shadow-glow-button-hover",
        [ButtonVariant.Accent]:
          "rounded-pill border border-border-strong bg-brand-gradient text-accent-foreground hover:brightness-110",
        [ButtonVariant.Secondary]:
          "rounded-pill border border-border-strong bg-white-2 text-foreground backdrop-blur-glass-sm hover:border-white-40 hover:bg-surface",
        [ButtonVariant.Badge]:
          "rounded-pill border border-border-strong !px-5 !py-2 text-foreground normal-case",
        [ButtonVariant.Ghost]:
          "rounded-pill border border-border bg-surface text-foreground backdrop-blur-glass-sm hover:border-border-strong hover:bg-surface-muted",
        [ButtonVariant.GhostDark]:
          "rounded-pill bg-secondary text-secondary-foreground hover:bg-secondary-hover",
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
