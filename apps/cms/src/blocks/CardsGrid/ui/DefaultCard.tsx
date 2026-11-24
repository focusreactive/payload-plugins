import { ChevronRight } from "lucide-react";

import { cn, cva } from "@/components/utils";
import { Link } from "@/components/link";
import { ButtonVariant } from "@/components/button/types";
import type { IDefaultCardProps } from "./types";

const cardVariants = cva(
  [
    "group relative isolate flex h-full flex-col gap-8 overflow-clip md:gap-10",
    "rounded-2xl border border-border-strong p-8 md:p-10 md:pr-12 md:pb-12",
    "text-foreground transition-[border-color] duration-300 ease-out",
    // Hover wash: the magenta inner glow from the design's hover state
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-glow-card",
    "after:opacity-0 after:transition-opacity after:duration-500 after:ease-out",
    "hover:after:opacity-100 focus-within:after:opacity-100 motion-reduce:after:transition-none",
  ],
  {
    defaultVariants: { backgroundColor: "none" },
    variants: {
      backgroundColor: {
        none: "glass",
        light: "glass",
        "light-gray": "bg-surface-muted backdrop-blur-glass",
        dark: "bg-ink-950",
        "dark-gray": "bg-ink-900",
        "gradient-2": "border-border-strong bg-brand-gradient",
      },
    },
  }
);

const alignVariants = cva("", {
  defaultVariants: { alignVariant: "left" },
  variants: {
    alignVariant: {
      left: "items-start text-left",
      center: "items-center text-center",
      right: "items-end text-right",
    },
  },
});

export default function DefaultCard({
  image: _image,
  link,
  title,
  description,
  backgroundColor,
  icon,
  alignVariant,
}: IDefaultCardProps) {
  const align = alignVariants({ alignVariant });

  return (
    <article className={cn(cardVariants({ backgroundColor: backgroundColor ?? "none" }), align)}>
      {icon !== undefined && (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface text-foreground md:size-16">
          {icon !== null ? icon : <span className="text-h-item leading-none">✦</span>}
        </div>
      )}

      <div className={cn("flex w-full flex-1 flex-col gap-6 pb-4", align)}>
        {title && <h3 className="text-h-card">{title}</h3>}
        {description && <p className="text-body text-muted-foreground">{description}</p>}
      </div>

      {link?.href && (
        <Link
          {...link}
          className={cn(
            (link.variant ?? ButtonVariant.Default) === ButtonVariant.Default && "!p-0 leading-5"
          )}
        >
          <span>{link.text || "Learn more"}</span>
          <ChevronRight
            aria-hidden
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </Link>
      )}
    </article>
  );
}
