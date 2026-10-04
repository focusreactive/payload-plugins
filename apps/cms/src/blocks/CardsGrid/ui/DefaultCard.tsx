import { cn, cva } from "@/components/utils";
import { Link } from "@/components/link";
import { ButtonVariant } from "@/components/button/types";
import type { IDefaultCardProps } from "./types";

// §6.6 Card: hairline border, 12px radius, 28px padding; hover = racing-green border + light-green
// top rule (inset shadow), no lift. Colours come from the zone tokens, so one card works on every theme.
const cardVariants = cva(
  [
    "group relative flex h-full flex-col gap-4 overflow-hidden border p-7",
    "transition-[border-color,box-shadow] duration-200 ease-out",
  ],
  {
    defaultVariants: { backgroundColor: "light" },
    variants: {
      backgroundColor: {
        light: "bg-card text-card-foreground border-border",
        "light-gray": "bg-ct-sand text-ct-grey-900 border-ct-grey-300",
        dark: "dark-zone bg-ct-dark-blue text-ct-white border-white/15",
        "dark-gray": "dark-zone bg-ct-teal text-ct-white border-white/15",
        // Legacy option kept for existing content; renders as the dark-blue card (no gradients, §6.12).
        "gradient-2": "dark-zone bg-ct-dark-blue text-ct-white border-white/15",
        none: "bg-transparent border-border",
      },
      interactive: {
        true: "hover:border-primary hover:shadow-[inset_0_3px_0_var(--color-highlight)]",
        false: "",
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
  number,
}: IDefaultCardProps) {
  const bg = backgroundColor ?? "light";
  const hasLink = Boolean(link?.href);

  const alignClass =
    alignVariant === "center"
      ? "items-center text-center"
      : alignVariant === "right"
        ? "items-end text-right"
        : "items-start";

  return (
    <article
      className={cn(
        cardVariants({ backgroundColor: bg, interactive: hasLink }),
        rounded === "none" ? "rounded-md" : "rounded-lg",
        alignClass
      )}
    >
      {icon !== undefined && (
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary-soft-foreground"
        >
          {icon ?? <span className="size-2 rounded-pill bg-current" />}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3">
        {number !== undefined && (
          <span className="text-eyebrow text-primary">{String(number).padStart(2, "0")}</span>
        )}
        {title && <h3 className="text-h-card text-heading">{title}</h3>}
        {description && <p className="text-body-lg text-muted-foreground">{description}</p>}
      </div>

      {hasLink && (
        <div className="mt-auto pt-1">
          <Link
            {...link}
            className={cn(
              // The whole card is the hit target; the visible link stays the accessible name.
              "after:absolute after:inset-0 after:content-['']",
              (link.variant ?? ButtonVariant.Default) === ButtonVariant.Default &&
                "inline-flex items-center gap-1.5 text-[0.9375rem] font-semibold text-primary hover:text-link-hover"
            )}
          >
            <span>{link.text ?? "Learn more"}</span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        </div>
      )}
    </article>
  );
}
