import { cn, cva } from "../../../utils";
import { Image } from "../../ui/image";
import { Link } from "../../ui/link";
import type { IDefaultCardProps } from "./types";

const cardVariants = cva("group relative flex h-full flex-col gap-6 rounded-lg p-8 transition-all duration-200 sm:p-10", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "bg-surface text-foreground border border-border hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-[0_10px_30px_-12px_rgba(17,17,17,0.12)]",
      "light-gray": "bg-muted text-foreground border border-transparent",
      dark: "bg-gray-950 text-cream-50 border border-white-10",
      "dark-gray": "bg-gray-800 text-cream-50 border border-white-10",
      "gradient-2": "bg-gradient-to-br from-orange-500 via-orange-500 to-orange-700 text-white border border-transparent",
      none: "bg-transparent border border-border",
    },
  },
});

const iconWrapVariants = cva("flex size-12 items-center justify-center rounded-md", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "bg-primary-soft text-primary",
      "light-gray": "bg-primary-soft text-primary",
      dark: "bg-primary text-primary-foreground",
      "dark-gray": "bg-primary text-primary-foreground",
      "gradient-2": "bg-white/20 text-white",
      none: "bg-primary-soft text-primary",
    },
  },
});

const titleVariants = cva("font-display text-2xl leading-tight tracking-tight sm:text-3xl", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-foreground",
      "light-gray": "text-foreground",
      dark: "text-cream-50",
      "dark-gray": "text-cream-50",
      "gradient-2": "text-white",
      none: "text-foreground",
    },
  },
});

const bodyVariants = cva("text-sm leading-relaxed sm:text-base", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-muted-foreground",
      "light-gray": "text-muted-foreground",
      dark: "text-cream-50/75",
      "dark-gray": "text-cream-50/75",
      "gradient-2": "text-white/90",
      none: "text-muted-foreground",
    },
  },
});

const linkVariants = cva("inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors", {
  defaultVariants: { backgroundColor: "light" },
  variants: {
    backgroundColor: {
      light: "text-primary hover:text-orange-700",
      "light-gray": "text-primary hover:text-orange-700",
      dark: "text-primary hover:text-primary-soft",
      "dark-gray": "text-primary hover:text-primary-soft",
      "gradient-2": "text-white hover:text-cream-50",
      none: "text-primary hover:text-orange-700",
    },
  },
});

export default function DefaultCard({ image, link, title, description, backgroundColor }: IDefaultCardProps) {
  return (
    <article className={cn(cardVariants({ backgroundColor }))}>
      <div className={iconWrapVariants({ backgroundColor })}>{image?.src ? <Image {...image} fit="contain" quality={85} /> : <span className="font-display text-lg italic">✦</span>}</div>

      <div className="flex flex-1 flex-col gap-3">
        {title && <h3 className={titleVariants({ backgroundColor })}>{title}</h3>}
        {description && <p className={bodyVariants({ backgroundColor })}>{description}</p>}
      </div>

      {link?.href && (
        <div className="mt-auto pt-2">
          <Link {...link} className={linkVariants({ backgroundColor })}>
            <span>{link.text ?? "Learn more"}</span>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-3.5 transition-transform group-hover:translate-x-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      )}
    </article>
  );
}
