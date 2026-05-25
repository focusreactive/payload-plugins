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
        [ButtonSize.Small]: "px-3 py-1.5 text-xs",
        [ButtonSize.Base]: "px-5 py-2.5 text-sm",
        [ButtonSize.Large]: "px-6 py-3.5 text-base",
      },
      variant: {
        [ButtonVariant.Default]: "text-foreground hover:text-primary underline-offset-4 hover:underline",
        [ButtonVariant.Primary]: "rounded-pill font-medium bg-foreground text-background hover:bg-gray-700",
        [ButtonVariant.Secondary]: "rounded-pill font-medium border border-foreground text-foreground hover:bg-foreground hover:text-background",
        [ButtonVariant.Badge]: "rounded-pill border border-foreground px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-foreground",
        [ButtonVariant.Ghost]: "rounded-pill font-medium bg-surface text-foreground border border-border hover:border-foreground",
        [ButtonVariant.GhostDark]: "rounded-pill font-medium bg-foreground text-background hover:bg-gray-700",
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
