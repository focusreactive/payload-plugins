import { cva } from "class-variance-authority";

import { cn } from "@/components/utils";
import { SectionHeading } from "@/components/SectionHeading";
import type { SectionHeadingProps } from "@/components/SectionHeading";

export type CtaBannerVariant = "default" | "accent" | "dark";

const bannerVariants = cva(
  "not-prose my-[2.4em] flex flex-col items-start gap-4 rounded-lg p-[clamp(26px,4vw,40px)]",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "border border-border bg-surface text-foreground",
        accent: "bg-accent text-accent-foreground",
        dark: "border border-border bg-surface text-foreground",
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
    <div
      className={cn(bannerVariants({ variant: resolved }))}
      data-theme={resolved === "dark" ? "dark" : undefined}
    >
      <SectionHeading {...heading} align="left" size="h-section" />
      <div className="flex flex-wrap items-center gap-3.5">{actions}</div>
    </div>
  );
}
