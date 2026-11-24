import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { SectionHeading } from "@/components/SectionHeading";
import type { SectionHeadingProps } from "@/components/SectionHeading";

export type CtaBannerVariant = "default" | "accent" | "dark";

const bannerVariants = cva(
  "not-prose my-[2.4em] flex flex-col items-start gap-8 rounded-2xl p-8 md:p-10",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "border border-border-strong bg-surface text-foreground",
        accent: "border border-border-strong bg-brand-gradient text-accent-foreground",
        dark: "border border-border bg-ink-950 text-foreground",
      },
    },
  }
);

interface CtaBannerProps {
  heading: SectionHeadingProps;
  actions: React.ReactNode;
  variant?: CtaBannerVariant | null;
}

export function CtaBanner({ heading, actions, variant }: CtaBannerProps) {
  const resolved: CtaBannerVariant = variant ?? "default";

  return (
    <div className={cn(bannerVariants({ variant: resolved }))}>
      <SectionHeading {...heading} align="left" size="h-section" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4">{actions}</div>
    </div>
  );
}
