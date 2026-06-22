import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../../../utils";
import { ButtonSize, ButtonVariant } from "./types";
import type { ButtonProps } from "./types";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 leading-none whitespace-nowrap transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    defaultVariants: {
      size: ButtonSize.Base,
      variant: ButtonVariant.Default,
    },
    variants: {
      size: {
        [ButtonSize.Small]: "px-4 py-[9px] text-[0.82rem]",
        [ButtonSize.Base]: "px-6 py-[13px] text-[0.95rem]",
        [ButtonSize.Large]: "px-[30px] py-4 text-[1.02rem]",
      },
      variant: {
        [ButtonVariant.Default]: "p-0 text-foreground hover:text-primary",
        [ButtonVariant.Primary]: "rounded-pill font-semibold bg-secondary text-secondary-foreground hover:bg-secondary-hover",
        [ButtonVariant.Accent]: "rounded-pill font-semibold bg-accent text-accent-foreground hover:bg-accent-hover",
        [ButtonVariant.Secondary]: "rounded-pill font-semibold border border-foreground text-foreground hover:bg-foreground hover:text-background",
        [ButtonVariant.Badge]: "rounded-pill border border-foreground px-3 py-1.5 text-eyebrow text-foreground",
        [ButtonVariant.Ghost]: "rounded-pill font-semibold bg-surface text-foreground border border-border-strong hover:border-foreground",
        [ButtonVariant.GhostDark]: "rounded-pill font-semibold bg-secondary text-secondary-foreground hover:bg-secondary-hover",
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
