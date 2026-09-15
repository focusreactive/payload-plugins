import type { VariantProps } from "class-variance-authority";

import type { buttonVariants } from "./index";

export type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends React.ComponentPropsWithoutRef<"button">, ButtonVariantProps {
  /**
   * Renders via Radix Slot instead of a native `<button>`, so the concept's anchor-shaped controls
   * (nav links, the header CTA, every "Get Started") can be a `next/link` while keeping this
   * component's classes. The href and other anchor-only attributes go on that child, not here.
   */
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}
