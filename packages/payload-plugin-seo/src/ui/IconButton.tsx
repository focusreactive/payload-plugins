"use client";

import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-rs size-[26px] cursor-pointer transition-colors [&_svg]:size-[14px]",
  {
    variants: {
      variant: {
        primary: "text-neutral-0 bg-neutral-1000 hover:bg-neutral-800",
        error: "text-seo-bad bg-seo-bad-100 hover:bg-seo-bad-200",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "error";
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({
  variant,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button className={iconButtonVariants({ variant, className })} type={type} {...props}>
      {children}
    </button>
  );
}
