"use client";

import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactNode } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[6px] rounded-rs px-[14px] py-[8px] text-[12px] font-semibold [&_svg]:size-[14px]",
  {
    variants: {
      variant: {
        primary: "text-neutral-0 bg-neutral-1000 hover:bg-black",
        error: "text-seo-bad bg-seo-bad-100 hover:bg-seo-200",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "error";
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant,
  icon,
  children,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button className={buttonVariants({ variant, className })} type={type} {...props}>
      {icon}
      {children}
    </button>
  );
}
