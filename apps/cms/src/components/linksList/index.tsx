import NextLink from "next/link";

import { cn } from "@/components/utils";
import { AlignVariant } from "./types";
import type { ILinksListProps } from "./types";

export function LinksList({ links, alignVariant }: ILinksListProps) {
  if (!links?.length) return null;

  const alignClass =
    alignVariant === AlignVariant.Center
      ? "text-center items-center"
      : alignVariant === AlignVariant.Right
        ? "text-right items-end"
        : "text-left items-start";

  return (
    <div className={cn("flex flex-col gap-1", alignClass)}>
      {links.map((link, i) => (
        <NextLink
          key={i}
          href={link.href ?? "#"}
          className={cn(
            "group inline-flex items-center gap-2 py-1",
            "font-mono text-sm leading-relaxed tracking-wide text-foreground/80",
            "transition-colors hover:text-primary",
            alignVariant === AlignVariant.Center && "justify-center",
            alignVariant === AlignVariant.Right && "justify-end"
          )}
        >
          {link.text}
          <span
            className="translate-x-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 text-primary"
            aria-hidden
          >
            →
          </span>
        </NextLink>
      ))}
    </div>
  );
}
