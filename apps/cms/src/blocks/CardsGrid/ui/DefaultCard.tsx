import { cn, cva } from "@/components/utils";
import { Link } from "@/components/link";
import { ButtonVariant } from "@/components/button/types";
import type { IDefaultCardProps } from "./types";

/**
 * Flat card, hairline border, no shadow and no hover glow: DESIGN.md makes the rule the structural
 * device of this site, so a card that lifts or glows reads as a different product.
 */
const cardVariants = cva(
  [
    "group relative flex h-full flex-col gap-[14px]",
    "border border-border rounded-[4px] p-7",
    "transition-colors duration-200 ease-out",
  ],
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: "bg-surface text-foreground",
        "light-gray": "bg-surface-muted text-foreground",
        dark: "bg-surface text-foreground",
        "dark-gray": "bg-surface-muted text-foreground",
        "gradient-2": "bg-surface text-foreground",
        none: "bg-transparent text-foreground",
      },
    },
  }
);

const iconTileVariants = cva(
  "relative z-[1] flex size-6 shrink-0 items-center justify-center text-muted-foreground",
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: "",
        "light-gray": "",
        dark: "",
        "dark-gray": "",
        "gradient-2": "",
        none: "",
      },
    },
  }
);

const titleVariants = cva("relative z-[1] text-h-card transition-colors", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-foreground",
      "light-gray": "text-foreground",
      dark: "text-foreground",
      "dark-gray": "text-foreground",
      "gradient-2": "text-foreground",
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
      dark: "text-muted-foreground",
      "dark-gray": "text-muted-foreground",
      "gradient-2": "text-muted-foreground",
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
        "gradient-2": "text-primary hover:text-primary-hover",
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

  const roundedClass = rounded === "large" ? "p-8" : "";

  return (
    <div className={cn(cardVariants({ backgroundColor: bg }), roundedClass, alignClass)}>
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
        {title && (
          <h3
            className={cn(
              titleVariants({ backgroundColor: bg }),
              // Only a card with a real destination should look interactive on hover.
              link?.href && "group-hover:text-primary"
            )}
          >
            {title}
          </h3>
        )}
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
    </div>
  );
}
