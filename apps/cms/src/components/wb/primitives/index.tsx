import Link from "next/link";

import { cn } from "@/components/utils";

// Shared WealthBriefing presentational atoms used across the homepage sections.
// Purely visual: props in, JSX out. `onDark` flips text to white for teal/black zones.

export function Eyebrow({
  children,
  onDark = false,
  className,
}: {
  children: React.ReactNode;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-eyebrow",
        onDark ? "text-white" : "text-primary",
        className
      )}
    >
      <span className="size-1.5 shrink-0 rounded-full bg-primary" />
      {children}
    </div>
  );
}

export function Pill({
  children,
  variant = "onImage",
  className,
}: {
  children: React.ReactNode;
  variant?: "onImage" | "solid" | "soft";
  className?: string;
}) {
  const variants = {
    onImage: "bg-white/20 text-white",
    solid: "bg-secondary text-white",
    soft: "bg-chip text-secondary",
  } as const;
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-pill px-3 py-1 text-[12px] font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function CtaLink({
  children,
  href = "#",
  onDark = false,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-semibold no-underline transition-colors",
        onDark ? "text-white hover:text-white/80" : "text-secondary hover:text-foreground",
        className
      )}
    >
      <span>{children}</span>
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </Link>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  cta,
  ctaHref = "#",
  onDark = false,
  divider = false,
  className,
  titleClassName,
}: {
  eyebrow: string;
  title: string;
  cta?: string;
  ctaHref?: string;
  onDark?: boolean;
  divider?: boolean;
  className?: string;
  // Per-section override for the h2 size/leading. Most sections use the
  // text-h-section default (36px); People Moves steps down to 32px/1.12.
  titleClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-6",
        divider && "border-b border-border pb-6",
        className
      )}
    >
      <div className="max-w-[680px]">
        <Eyebrow onDark={onDark} className="mb-3.5">
          {eyebrow}
        </Eyebrow>
        <h2
          className={cn(
            "text-h-section m-0",
            onDark ? "text-white" : "text-foreground",
            titleClassName
          )}
        >
          {title}
        </h2>
      </div>
      {cta ? (
        <CtaLink href={ctaHref} onDark={onDark} className="pb-1.5">
          {cta}
        </CtaLink>
      ) : null}
    </div>
  );
}
