import { cn, cva } from "@/components/utils";
import { Link } from "@/components/link";
import { ButtonVariant } from "@/components/button/types";
import { GlowCard } from "./GlowCard";
import type { IDefaultCardProps } from "./types";

const cardVariants = cva(
  [
    "group relative overflow-hidden",
    "flex h-full flex-col gap-[14px]",
    "border rounded-md p-[26px]",
    "transition-[transform,box-shadow,border-color] duration-[280ms,360ms,360ms] ease-out",
    "before:pointer-events-none before:absolute before:inset-0 before:z-0",
    "before:bg-[radial-gradient(440px_circle_at_var(--mx,50%)_var(--my,50%),color-mix(in_srgb,var(--color-primary)_18%,transparent),transparent_62%)]",
    "before:opacity-0 before:transition-opacity before:duration-500",
    "motion-safe:hover:before:opacity-100",
  ],
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: [
          "bg-surface text-foreground border-border",
          "hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]",
          "hover:shadow-[0_22px_50px_-28px_color-mix(in_srgb,var(--color-primary)_42%,rgba(10,19,20,0.5))]",
        ],
        "light-gray": [
          "bg-surface-muted text-foreground border-transparent",
          "hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]",
          "hover:shadow-[0_22px_50px_-28px_color-mix(in_srgb,var(--color-primary)_42%,rgba(10,19,20,0.5))]",
        ],
        dark: [
          "bg-[var(--color-deep-900)] text-slate-50 border-white/10",
          "hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]",
        ],
        "dark-gray": [
          "bg-[var(--color-pine-900)] text-slate-50 border-white/10",
          "hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]",
        ],
        "gradient-2": [
          "bg-gradient-to-br from-teal-600 to-ink-950 text-white border-transparent",
          "hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]",
        ],
        none: [
          "bg-transparent border-border",
          "hover:border-[color-mix(in_srgb,var(--color-primary)_30%,var(--color-border))]",
          "hover:shadow-[0_22px_50px_-28px_color-mix(in_srgb,var(--color-primary)_42%,rgba(10,19,20,0.5))]",
        ],
      },
    },
  }
);

const iconTileVariants = cva(
  "relative z-[1] flex size-[46px] shrink-0 items-center justify-center rounded-md transition-transform duration-[360ms] ease-out group-hover:scale-[1.06]",
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: "bg-primary-soft text-primary",
        "light-gray": "bg-primary-soft text-primary",
        dark: "bg-white/[0.12] text-accent",
        "dark-gray": "bg-white/[0.12] text-accent",
        "gradient-2": "bg-white/20 text-white",
        none: "bg-primary-soft text-primary",
      },
    },
  }
);

const titleVariants = cva("relative z-[1] text-h-card", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-foreground",
      "light-gray": "text-foreground",
      dark: "text-slate-50",
      "dark-gray": "text-slate-50",
      "gradient-2": "text-white",
      none: "text-foreground",
    },
  },
});

const bodyVariants = cva("relative z-[1] text-body-lg leading-[1.6]", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-muted-foreground",
      "light-gray": "text-muted-foreground",
      dark: "text-slate-50/75",
      "dark-gray": "text-slate-50/75",
      "gradient-2": "text-white/90",
      none: "text-muted-foreground",
    },
  },
});

const linkVariants = cva(
  "relative z-[1] inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: "text-primary hover:text-primary-hover",
        "light-gray": "text-primary hover:text-primary-hover",
        dark: "text-primary hover:text-primary-hover",
        "dark-gray": "text-primary hover:text-primary-hover",
        "gradient-2": "text-white hover:text-slate-50",
        none: "text-primary hover:text-primary-hover",
      },
    },
  }
);

export default function DefaultCard({
  image: _image,
  link,
  title,
  description,
  backgroundColor,
  icon,
  rounded,
  alignVariant,
}: IDefaultCardProps) {
  const bg = backgroundColor ?? "light";

  const alignClass =
    alignVariant === "center"
      ? "items-center text-center"
      : alignVariant === "right"
        ? "items-end text-right"
        : "items-start";

  const roundedClass = rounded === "large" ? "rounded-lg p-[30px]" : "";

  return (
    <GlowCard className={cn(cardVariants({ backgroundColor: bg }), roundedClass, alignClass)}>
      {icon !== undefined && (
        <div className={iconTileVariants({ backgroundColor: bg })}>
          {icon !== null ? (
            icon
          ) : (
            <span className="font-display text-lg italic leading-none">✦</span>
          )}
        </div>
      )}

      <div className="relative z-[1] flex flex-1 flex-col gap-3">
        {title && <h3 className={titleVariants({ backgroundColor: bg })}>{title}</h3>}
        {description && <p className={bodyVariants({ backgroundColor: bg })}>{description}</p>}
      </div>

      {link?.href && (
        <div className="relative z-[1] mt-auto pt-2">
          <Link
            {...link}
            className={cn(
              "relative z-[1]",
              (link.variant ?? ButtonVariant.Default) === ButtonVariant.Default &&
                linkVariants({ backgroundColor: bg })
            )}
          >
            <span>{link.text ?? "Learn more"}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </Link>
        </div>
      )}
    </GlowCard>
  );
}
